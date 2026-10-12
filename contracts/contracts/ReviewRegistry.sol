// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice A nonfinancial revision registry. A commitment records a review, never methane truth.
contract ReviewRegistry {
    bytes32 public immutable deploymentSalt;
    string public constant protocol = "afterplume/1";
    struct ReviewCase { address owner; bool active; uint64 revision; bytes32 digest; }
    struct Acknowledgement { address reviewer; bytes32 responseHash; }
    mapping(bytes32 => ReviewCase) public cases;
    mapping(address => uint256) public nonces;
    mapping(bytes32 => mapping(address => bool)) public reviewers;
    mapping(bytes32 => mapping(uint64 => bytes32)) public revisionDigests;
    mapping(bytes32 => mapping(uint64 => Acknowledgement)) public acknowledgements;

    event CaseCreated(bytes32 indexed caseId, address indexed owner, uint64 revision, bytes32 digest);
    event RevisionPublished(bytes32 indexed caseId, uint64 revision, bytes32 previousDigest, bytes32 digest);
    event ReviewerAuthorized(bytes32 indexed caseId, address indexed reviewer, bool authorized);
    event ReviewAcknowledged(bytes32 indexed caseId, uint64 revision, address indexed reviewer, bytes32 digest, bytes32 responseHash);
    event CaseWithdrawn(bytes32 indexed caseId, uint64 revision, bytes32 digest);
    error Unauthorized(); error Inactive(); error InvalidDigest(); error StaleRevision(); error InvalidReviewer();

    constructor(bytes32 salt) { if (salt == bytes32(0)) revert InvalidDigest(); deploymentSalt = salt; }
    modifier ownerOnly(bytes32 caseId) { if (cases[caseId].owner != msg.sender) revert Unauthorized(); _; }
    modifier activeOnly(bytes32 caseId) { if (!cases[caseId].active) revert Inactive(); _; }

    function createCase(bytes32 digest) external returns (bytes32 caseId) {
        if (digest == bytes32(0)) revert InvalidDigest();
        caseId = keccak256(abi.encode(block.chainid, address(this), deploymentSalt, msg.sender, nonces[msg.sender]++));
        cases[caseId] = ReviewCase(msg.sender, true, 1, digest);
        revisionDigests[caseId][1] = digest;
        emit CaseCreated(caseId, msg.sender, 1, digest);
    }
    function publishRevision(bytes32 caseId, uint64 nextRevision, bytes32 previousDigest, bytes32 digest) external ownerOnly(caseId) activeOnly(caseId) {
        ReviewCase storage c = cases[caseId];
        if (nextRevision != c.revision + 1 || previousDigest != c.digest) revert StaleRevision();
        if (digest == bytes32(0) || digest == c.digest) revert InvalidDigest();
        c.revision = nextRevision; c.digest = digest;
        revisionDigests[caseId][nextRevision] = digest;
        emit RevisionPublished(caseId, nextRevision, previousDigest, digest);
    }
    function authorizeReviewer(bytes32 caseId, address reviewer, bool authorized) external ownerOnly(caseId) activeOnly(caseId) {
        if (reviewer == address(0) || reviewer == msg.sender) revert InvalidReviewer();
        reviewers[caseId][reviewer] = authorized;
        emit ReviewerAuthorized(caseId, reviewer, authorized);
    }
    function acknowledgeReview(bytes32 caseId, uint64 revision, bytes32 digest, bytes32 responseHash) external activeOnly(caseId) {
        if (!reviewers[caseId][msg.sender]) revert Unauthorized();
        ReviewCase memory c = cases[caseId];
        if (revision != c.revision || digest != c.digest) revert StaleRevision();
        if (responseHash == bytes32(0)) revert InvalidDigest();
        acknowledgements[caseId][revision] = Acknowledgement(msg.sender, responseHash);
        emit ReviewAcknowledged(caseId, revision, msg.sender, digest, responseHash);
    }
    function withdrawCase(bytes32 caseId) external ownerOnly(caseId) activeOnly(caseId) {
        ReviewCase storage c = cases[caseId]; c.active = false;
        emit CaseWithdrawn(caseId, c.revision, c.digest);
    }
}
