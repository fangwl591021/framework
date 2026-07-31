export interface ModuleBoundary {
  readonly id:
    | "identity-core"
    | "tenant-access"
    | "authorization"
    | "core-operations";
  readonly lifecycle: "Candidate";
  readonly contract: "Approved";
  readonly implementation: "Locally Implemented";
  readonly verification: "Locally Verified";
  readonly deployment: "Not Deployed";
  readonly dependencies: readonly ModuleBoundary["id"][];
}
