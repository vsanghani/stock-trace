import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
const { matchPreviewSmoke } = require("../../../scripts/preview-smoke-match.cjs") as {
    matchPreviewSmoke: (
        deployment: { ref?: string; sha?: string },
        pulls: Array<{ number: number; baseRef: string; headRef: string; headSha: string }>
    ) => { action: "run" | "fail" | "skip"; message: string; pullNumber?: number }
}

const HEAD = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

const watched = {
    number: 45,
    baseRef: "development",
    headRef: "cursor/phase1-backend-stabilisation-c3b8",
    headSha: HEAD,
}

describe("matchPreviewSmoke", () => {
    it("runs when the pull request head SHA is the deployment SHA", () => {
        const decision = matchPreviewSmoke({ ref: watched.headRef, sha: HEAD }, [watched])
        expect(decision.action).toBe("run")
        expect(decision.pullNumber).toBe(45)
    })

    it("runs when deployment.ref is the head SHA and there is no branch name", () => {
        const decision = matchPreviewSmoke({ ref: HEAD, sha: HEAD }, [watched])
        expect(decision.action).toBe("run")
        expect(decision.pullNumber).toBe(45)
    })

    it("runs for a pull request into feature/** when the head SHA matches", () => {
        const decision = matchPreviewSmoke(
            { ref: "feature/child", sha: HEAD },
            [{ ...watched, baseRef: "feature/parent", headRef: "feature/child" }]
        )
        expect(decision.action).toBe("run")
    })

    it("fails when the branch matches a pull request but the commit does not", () => {
        const decision = matchPreviewSmoke({ ref: watched.headRef, sha: OTHER }, [watched])
        expect(decision.action).toBe("fail")
        expect(decision.message).toContain("Pull request #45")
        expect(decision.message).toContain(HEAD)
        expect(decision.message).toContain(OTHER)
        expect(decision.message).toContain(watched.headRef)
    })

    it("skips a development deploy when no pull request head is that commit", () => {
        const decision = matchPreviewSmoke({ ref: "development", sha: OTHER }, [watched])
        expect(decision.action).toBe("skip")
        expect(decision.message).toContain("Skipping smoke")
    })

    it("skips a feature branch that has no open pull request", () => {
        const decision = matchPreviewSmoke({ ref: "feature/wip", sha: OTHER }, [watched])
        expect(decision.action).toBe("skip")
    })

    it("skips a SHA ref that no open pull request claims", () => {
        const decision = matchPreviewSmoke({ ref: OTHER, sha: OTHER }, [watched])
        expect(decision.action).toBe("skip")
    })

    it("ignores a matching commit whose pull request does not target a watched base", () => {
        const decision = matchPreviewSmoke({ ref: "hotfix", sha: HEAD }, [{ ...watched, baseRef: "main" }])
        expect(decision.action).toBe("skip")
    })
})
