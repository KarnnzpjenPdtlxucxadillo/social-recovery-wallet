// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PrivacyWalletRecoveryFHE is SepoliaConfig {
    struct EncryptedGuardian {
        euint32 encryptedAddress;
    }

    struct RecoveryRequest {
        uint256 requestId;
        euint32 encryptedApprovalCount;
        uint256 timestamp;
        bool executed;
    }

    uint256 public requestCounter;
    mapping(address => EncryptedGuardian[]) private userGuardians;
    mapping(uint256 => RecoveryRequest) public recoveryRequests;
    mapping(uint256 => address) private requestToUser;

    event RecoveryRequested(uint256 indexed requestId, uint256 timestamp);
    event RecoveryExecuted(uint256 indexed requestId);

    modifier onlyUser(address user) {
        _;
    }

    /// @notice Add encrypted guardians for a wallet
    function setEncryptedGuardians(EncryptedGuardian[] memory guardians) public {
        delete userGuardians[msg.sender];
        for (uint i = 0; i < guardians.length; i++) {
            userGuardians[msg.sender].push(guardians[i]);
        }
    }

    /// @notice Initiate a recovery request
    function requestWalletRecovery() public onlyUser(msg.sender) {
        requestCounter += 1;
        uint256 newId = requestCounter;

        recoveryRequests[newId] = RecoveryRequest({
            requestId: newId,
            encryptedApprovalCount: FHE.asEuint32(0),
            timestamp: block.timestamp,
            executed: false
        });

        requestToUser[newId] = msg.sender;

        emit RecoveryRequested(newId, block.timestamp);
    }

    /// @notice Guardians submit encrypted approvals
    function submitEncryptedApproval(
        uint256 requestId,
        ebool encryptedApproval
    ) public {
        require(requestId > 0 && requestId <= requestCounter, "Invalid request");
        RecoveryRequest storage req = recoveryRequests[requestId];
        require(!req.executed, "Already executed");

        // Aggregate approval count
        if (encryptedApproval.value) {
            req.encryptedApprovalCount = FHE.add(req.encryptedApprovalCount, FHE.asEuint32(1));
        }
    }

    /// @notice Request decryption of aggregated approvals
    function requestApprovalDecryption(uint256 requestId) public onlyUser(requestToUser[requestId]) {
        RecoveryRequest storage req = recoveryRequests[requestId];
        require(!req.executed, "Already executed");

        bytes32 ;
        ciphertexts[0] = FHE.toBytes32(req.encryptedApprovalCount);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptApproval.selector);
        requestToUser[reqId] = requestToUser[requestId];
    }

    /// @notice Callback for decrypted approval count
    function decryptApproval(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        address user = requestToUser[requestId];
        require(user != address(0), "Invalid request");

        FHE.checkSignatures(requestId, cleartexts, proof);

        uint32 approvalCount = abi.decode(cleartexts, (uint32));
        RecoveryRequest storage req = recoveryRequests[requestId];
        require(!req.executed, "Already executed");

        if (approvalCount > userGuardians[user].length / 2) {
            req.executed = true;
            emit RecoveryExecuted(req.requestId);
        }
    }

    /// @notice Get number of guardians for a user
    function getGuardianCount(address user) public view returns (uint256) {
        return userGuardians[user].length;
    }
}
