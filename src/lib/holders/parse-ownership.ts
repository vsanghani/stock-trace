import { padCik, parseEdgarDate } from "@/lib/holders/dates"
import { asArray, child, fieldText, parseXml } from "@/lib/holders/xml"

export interface OwnershipPosition {
    formType: string
    filerCik: string
    filerName: string
    issuerCik: string
    issuerName: string
    issuerCusip: string | null
    classTitle: string | null
    asOf: string
    shares: number | null
    percentOfClass: number | null
}

function parseDecimal(value: string | null): number | null {
    if (!value) return null
    const parsed = Number(value.replace(/,/g, ""))
    return Number.isFinite(parsed) ? parsed : null
}

function firstCusip(node: unknown): string | null {
    const values = asArray(child(node, "issuerCusipNumber"))
        .map((item) => fieldText(item))
        .filter((item): item is string => !!item && /^[0-9A-Za-z*@#]{9}$/.test(item))
    return values[0]?.toUpperCase() ?? null
}

function personShares(person: unknown): number | null {
    return (
        parseDecimal(fieldText(child(person, "aggregateAmountOwned"))) ??
        parseDecimal(fieldText(child(person, "reportingPersonBeneficiallyOwnedAggregateNumberOfShares")))
    )
}

function personPercent(person: unknown): number | null {
    return parseDecimal(fieldText(child(person, "percentOfClass"))) ?? parseDecimal(fieldText(child(person, "classPercent")))
}

/** Parse a Schedule 13D or 13G XML submission into one row per reporting person. */
export function parseOwnershipXml(xml: string): OwnershipPosition[] {
    const root = child(parseXml(xml), "edgarSubmission")
    if (!root) return []

    const live = fieldText(child(root, "headerData", "filerInfo", "liveTestFlag"))
    if (live && live.toUpperCase() === "TEST") return []

    const formType = fieldText(child(root, "headerData", "submissionType"))
    if (!formType) return []

    const headerCik = fieldText(child(root, "headerData", "filerInfo", "filer", "filerCredentials", "cik"))
    const cover = child(root, "formData", "coverPageHeader")
    const issuer = child(cover, "issuerInfo")
    const issuerCik = fieldText(child(issuer, "issuerCIK")) ?? fieldText(child(issuer, "issuerCik"))
    const issuerName = fieldText(child(issuer, "issuerName"))
    if (!issuerCik || !issuerName) return []

    const asOf =
        parseEdgarDate(fieldText(child(cover, "dateOfEvent"))) ??
        parseEdgarDate(fieldText(child(cover, "eventDateRequiresFilingThisStatement")))
    if (!asOf) return []

    const classTitle = fieldText(child(cover, "securitiesClassTitle"))
    const cusip = firstCusip(child(issuer, "issuerCusips"))

    const people = [
        ...asArray(child(root, "formData", "reportingPersons", "reportingPersonInfo")),
        ...asArray(child(cover, "coverPageHeaderReportingPersonDetails")),
    ]

    const positions: OwnershipPosition[] = []
    for (const person of people) {
        const name = fieldText(child(person, "reportingPersonName"))
        if (!name) continue
        const cik =
            fieldText(child(person, "reportingPersonCIK")) ??
            fieldText(child(person, "reportingCik")) ??
            headerCik
        if (!cik) continue
        const shares = personShares(person)
        const percent = personPercent(person)
        if (shares == null && percent == null) continue
        positions.push({
            formType: formType.toUpperCase(),
            filerCik: padCik(cik),
            filerName: name,
            issuerCik: padCik(issuerCik),
            issuerName,
            issuerCusip: cusip,
            classTitle,
            asOf,
            shares,
            percentOfClass: percent,
        })
    }

    return positions
}
