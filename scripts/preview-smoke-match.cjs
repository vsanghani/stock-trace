/**
 * Decide whether a Vercel deployment_status event should smoke a preview.
 *
 * Run when an open pull request into development or feature/** is exactly
 * this commit. Fail when the branch matches a pull request but the commit
 * is not that pull request's head. Otherwise skip: plain branch deploys,
 * no open pull request, or a ref that is only a SHA.
 */

const FULL_SHA = /^[0-9a-f]{40}$/i

function isFullSha(value) {
    return FULL_SHA.test(value)
}

function sameSha(left, right) {
    return Boolean(left) && Boolean(right) && left.toLowerCase() === right.toLowerCase()
}

function isWatchedBase(baseRef) {
    return baseRef === "development" || baseRef.startsWith("feature/")
}

/**
 * @param {{ ref?: string, sha?: string }} deployment
 * @param {Array<{ number: number, baseRef: string, headRef: string, headSha: string }>} pulls
 * @returns {{ action: "run" | "fail" | "skip", message: string, pullNumber?: number }}
 */
function matchPreviewSmoke(deployment, pulls) {
    const ref = String(deployment.ref ?? "").trim()
    const shaField = String(deployment.sha ?? "").trim()
    const deploymentSha = isFullSha(shaField) ? shaField : isFullSha(ref) ? ref : ""
    const branch = ref && !isFullSha(ref) ? ref : ""
    const watched = pulls.filter((pull) => isWatchedBase(pull.baseRef))
    const shaCandidates = [deploymentSha, isFullSha(ref) ? ref : ""].filter(Boolean)

    const shaMatch = watched.find((pull) => shaCandidates.some((candidate) => sameSha(pull.headSha, candidate)))
    if (shaMatch) {
        return {
            action: "run",
            pullNumber: shaMatch.number,
            message: `Matched pull request #${shaMatch.number} (${shaMatch.headRef} @ ${shaMatch.headSha}).`,
        }
    }

    if (branch) {
        const branchMatch = watched.find((pull) => pull.headRef === branch)
        if (branchMatch && !sameSha(branchMatch.headSha, deploymentSha)) {
            const seen = deploymentSha || "(missing)"
            return {
                action: "fail",
                pullNumber: branchMatch.number,
                message:
                    `Pull request #${branchMatch.number} tracks ${branchMatch.headRef} @ ${branchMatch.headSha}, ` +
                    `but this deployment of ${branch} is ${seen}. ` +
                    "Refusing to smoke a commit that is not the pull request head.",
            }
        }
    }

    return {
        action: "skip",
        message:
            `No open pull request into development or feature/** is this deployment ` +
            `(ref=${ref || "(empty)"}, sha=${shaField || "(empty)"}). ` +
            "Skipping smoke for a branch deploy or a SHA with no matching pull request.",
    }
}

module.exports = { isFullSha, isWatchedBase, matchPreviewSmoke }
