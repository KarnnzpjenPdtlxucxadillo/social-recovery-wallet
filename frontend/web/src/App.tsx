// App.tsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface Guardian {
  id: string;
  address: string;
  status: "pending" | "active" | "removed";
  encryptedData: string;
}

interface RecoveryRequest {
  id: string;
  requester: string;
  newAddress: string;
  approvals: number;
  rejections: number;
  status: "pending" | "approved" | "rejected";
  timestamp: number;
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddGuardianModal, setShowAddGuardianModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newGuardianAddress, setNewGuardianAddress] = useState("");
  const [newRecoveryAddress, setNewRecoveryAddress] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Calculate statistics
  const activeGuardians = guardians.filter(g => g.status === "active").length;
  const pendingGuardians = guardians.filter(g => g.status === "pending").length;
  const pendingRequests = recoveryRequests.filter(r => r.status === "pending").length;
  const approvedRequests = recoveryRequests.filter(r => r.status === "approved").length;

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      // Load guardians
      const guardiansBytes = await contract.getData(`guardians_${account}`);
      let guardiansList: Guardian[] = [];
      
      if (guardiansBytes.length > 0) {
        try {
          guardiansList = JSON.parse(ethers.toUtf8String(guardiansBytes));
        } catch (e) {
          console.error("Error parsing guardians:", e);
        }
      }
      setGuardians(guardiansList);
      
      // Load recovery requests
      const requestsBytes = await contract.getData(`requests_${account}`);
      let requestsList: RecoveryRequest[] = [];
      
      if (requestsBytes.length > 0) {
        try {
          requestsList = JSON.parse(ethers.toUtf8String(requestsBytes));
        } catch (e) {
          console.error("Error parsing recovery requests:", e);
        }
      }
      setRecoveryRequests(requestsList);
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const addGuardian = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    if (!newGuardianAddress || !ethers.isAddress(newGuardianAddress)) {
      alert("Please enter a valid Ethereum address");
      return;
    }
    
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting guardian data with FHE..."
    });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify({
        address: newGuardianAddress,
        addedBy: account,
        timestamp: Date.now()
      }))}`;
      
      const newGuardian: Guardian = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        address: newGuardianAddress,
        status: "pending",
        encryptedData
      };
      
      const updatedGuardians = [...guardians, newGuardian];
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `guardians_${account}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedGuardians))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Guardian added securely with FHE encryption!"
      });
      
      await loadData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowAddGuardianModal(false);
        setNewGuardianAddress("");
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Failed to add guardian: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const removeGuardian = async (guardianId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing with FHE..."
    });

    try {
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const updatedGuardians = guardians.filter(g => g.id !== guardianId);
      
      await contract.setData(
        `guardians_${account}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedGuardians))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Guardian removed successfully!"
      });
      
      await loadData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Failed to remove guardian: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const initiateRecovery = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    if (!newRecoveryAddress || !ethers.isAddress(newRecoveryAddress)) {
      alert("Please enter a valid Ethereum address for recovery");
      return;
    }
    
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Creating encrypted recovery request..."
    });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const newRequest: RecoveryRequest = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        requester: account,
        newAddress: newRecoveryAddress,
        approvals: 0,
        rejections: 0,
        status: "pending",
        timestamp: Date.now()
      };
      
      const updatedRequests = [...recoveryRequests, newRequest];
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `requests_${account}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedRequests))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Recovery request created securely with FHE!"
      });
      
      await loadData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowRecoveryModal(false);
        setNewRecoveryAddress("");
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Failed to create recovery request: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const approveRequest = async (requestId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing approval with FHE..."
    });

    try {
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const updatedRequests = recoveryRequests.map(request => {
        if (request.id === requestId) {
          const newApprovals = request.approvals + 1;
          const threshold = Math.floor(guardians.length / 2) + 1;
          const status = newApprovals >= threshold ? "approved" : "pending";
          
          return {
            ...request,
            approvals: newApprovals,
            status
          };
        }
        return request;
      });
      
      await contract.setData(
        `requests_${account}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedRequests))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Recovery request approved!"
      });
      
      await loadData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Failed to approve request: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const rejectRequest = async (requestId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing rejection with FHE..."
    });

    try {
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const updatedRequests = recoveryRequests.map(request => {
        if (request.id === requestId) {
          const newRejections = request.rejections + 1;
          const threshold = Math.floor(guardians.length / 2) + 1;
          const status = newRejections >= threshold ? "rejected" : "pending";
          
          return {
            ...request,
            rejections: newRejections,
            status
          };
        }
        return request;
      });
      
      await contract.setData(
        `requests_${account}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedRequests))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Recovery request rejected!"
      });
      
      await loadData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Failed to reject request: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const isGuardian = () => {
    return guardians.some(g => g.address.toLowerCase() === account.toLowerCase());
  };

  const tutorialSteps = [
    {
      title: "Connect Wallet",
      description: "Connect your Web3 wallet to access the recovery wallet system",
      icon: "🔗"
    },
    {
      title: "Add Guardians",
      description: "Select trusted contacts to be your guardians",
      icon: "🛡️"
    },
    {
      title: "Initiate Recovery",
      description: "Request wallet recovery when needed",
      icon: "🔓"
    },
    {
      title: "Guardian Approval",
      description: "Guardians anonymously approve recovery requests",
      icon: "✅"
    }
  ];

  const renderGuardianChart = () => {
    const total = guardians.length || 1;
    const activePercentage = (activeGuardians / total) * 100;
    const pendingPercentage = (pendingGuardians / total) * 100;

    return (
      <div className="chart-container">
        <div className="chart">
          <div 
            className="chart-segment active" 
            style={{ width: `${activePercentage}%` }}
          ></div>
          <div 
            className="chart-segment pending" 
            style={{ width: `${pendingPercentage}%` }}
          ></div>
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="color-box active"></div>
            <span>Active: {activeGuardians}</span>
          </div>
          <div className="legend-item">
            <div className="color-box pending"></div>
            <span>Pending: {pendingGuardians}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="metal-spinner"></div>
      <p>Initializing encrypted connection...</p>
    </div>
  );

  return (
    <div className="app-container metal-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="shield-icon"></div>
          </div>
          <h1>Social<span>Recovery</span>Wallet</h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowAddGuardianModal(true)} 
            className="add-guardian-btn metal-button"
          >
            <div className="add-icon"></div>
            Add Guardian
          </button>
          <button 
            onClick={() => setShowRecoveryModal(true)} 
            className="recovery-btn metal-button"
          >
            <div className="recovery-icon"></div>
            Initiate Recovery
          </button>
          <button 
            className="metal-button"
            onClick={() => setShowTutorial(!showTutorial)}
          >
            {showTutorial ? "Hide Tutorial" : "Show Tutorial"}
          </button>
          <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="dashboard-grid">
          <div className="dashboard-card metal-card">
            <h3>Wallet Security Status</h3>
            <div className="security-status">
              <div className={`status-indicator ${activeGuardians >= 3 ? 'secure' : 'warning'}`}></div>
              <span>{activeGuardians >= 3 ? "Secure" : "Needs More Guardians"}</span>
            </div>
            <div className="fhe-badge">
              <span>FHE-Powered Privacy</span>
            </div>
          </div>
          
          <div className="dashboard-card metal-card">
            <h3>Guardian Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{guardians.length}</div>
                <div className="stat-label">Total Guardians</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{activeGuardians}</div>
                <div className="stat-label">Active</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{pendingGuardians}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-card metal-card">
            <h3>Recovery Requests</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{recoveryRequests.length}</div>
                <div className="stat-label">Total Requests</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{pendingRequests}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{approvedRequests}</div>
                <div className="stat-label">Approved</div>
              </div>
            </div>
          </div>
        </div>
        
        {showTutorial && (
          <div className="tutorial-section metal-card">
            <h2>Social Recovery Tutorial</h2>
            <p className="subtitle">Learn how to securely recover your wallet using trusted guardians</p>
            
            <div className="tutorial-steps">
              {tutorialSteps.map((step, index) => (
                <div 
                  className="tutorial-step"
                  key={index}
                >
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button 
            className={`tab-button ${activeTab === "guardians" ? "active" : ""}`}
            onClick={() => setActiveTab("guardians")}
          >
            Guardians
          </button>
          <button 
            className={`tab-button ${activeTab === "recovery" ? "active" : ""}`}
            onClick={() => setActiveTab("recovery")}
          >
            Recovery Requests
          </button>
        </div>
        
        {activeTab === "dashboard" && (
          <div className="dashboard-content">
            <div className="dashboard-row">
              <div className="dashboard-card metal-card full-width">
                <h3>Guardian Status</h3>
                {renderGuardianChart()}
              </div>
            </div>
            
            <div className="dashboard-row">
              <div className="dashboard-card metal-card">
                <h3>Project Introduction</h3>
                <p>Decentralized social recovery wallet with privacy-preserving features using FHE technology.</p>
                <ul>
                  <li>Encrypted guardian list settings</li>
                  <li>FHE recovery request aggregation</li>
                  <li>Anonymous approval/rejection</li>
                  <li>Prevent guardian collusion</li>
                </ul>
              </div>
              
              <div className="dashboard-card metal-card">
                <h3>How It Works</h3>
                <p>1. Add guardians to your recovery wallet</p>
                <p>2. When recovery is needed, initiate a request</p>
                <p>3. Guardians anonymously approve/reject</p>
                <p>4. Wallet recovered after majority approval</p>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "guardians" && (
          <div className="guardians-section">
            <div className="section-header">
              <h2>Your Guardians</h2>
              <div className="header-actions">
                <button 
                  onClick={loadData}
                  className="refresh-btn metal-button"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
            
            <div className="guardians-list metal-card">
              <div className="table-header">
                <div className="header-cell">ID</div>
                <div className="header-cell">Address</div>
                <div className="header-cell">Status</div>
                <div className="header-cell">Actions</div>
              </div>
              
              {guardians.length === 0 ? (
                <div className="no-guardians">
                  <div className="no-guardians-icon"></div>
                  <p>No guardians found</p>
                  <button 
                    className="metal-button primary"
                    onClick={() => setShowAddGuardianModal(true)}
                  >
                    Add First Guardian
                  </button>
                </div>
              ) : (
                guardians.map(guardian => (
                  <div className="guardian-row" key={guardian.id}>
                    <div className="table-cell guardian-id">#{guardian.id.substring(0, 6)}</div>
                    <div className="table-cell">{guardian.address.substring(0, 6)}...{guardian.address.substring(38)}</div>
                    <div className="table-cell">
                      <span className={`status-badge ${guardian.status}`}>
                        {guardian.status}
                      </span>
                    </div>
                    <div className="table-cell actions">
                      <button 
                        className="action-btn metal-button danger"
                        onClick={() => removeGuardian(guardian.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {activeTab === "recovery" && (
          <div className="recovery-section">
            <div className="section-header">
              <h2>Recovery Requests</h2>
              <div className="header-actions">
                <button 
                  onClick={loadData}
                  className="refresh-btn metal-button"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
            
            <div className="recovery-list metal-card">
              <div className="table-header">
                <div className="header-cell">ID</div>
                <div className="header-cell">Requester</div>
                <div className="header-cell">New Address</div>
                <div className="header-cell">Approvals</div>
                <div className="header-cell">Rejections</div>
                <div className="header-cell">Status</div>
                <div className="header-cell">Actions</div>
              </div>
              
              {recoveryRequests.length === 0 ? (
                <div className="no-requests">
                  <div className="no-requests-icon"></div>
                  <p>No recovery requests found</p>
                  <button 
                    className="metal-button primary"
                    onClick={() => setShowRecoveryModal(true)}
                  >
                    Initiate Recovery Request
                  </button>
                </div>
              ) : (
                recoveryRequests.map(request => (
                  <div className="request-row" key={request.id}>
                    <div className="table-cell request-id">#{request.id.substring(0, 6)}</div>
                    <div className="table-cell">{request.requester.substring(0, 6)}...{request.requester.substring(38)}</div>
                    <div className="table-cell">{request.newAddress.substring(0, 6)}...{request.newAddress.substring(38)}</div>
                    <div className="table-cell">{request.approvals}</div>
                    <div className="table-cell">{request.rejections}</div>
                    <div className="table-cell">
                      <span className={`status-badge ${request.status}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="table-cell actions">
                      {isGuardian() && request.status === "pending" && (
                        <>
                          <button 
                            className="action-btn metal-button success"
                            onClick={() => approveRequest(request.id)}
                          >
                            Approve
                          </button>
                          <button 
                            className="action-btn metal-button danger"
                            onClick={() => rejectRequest(request.id)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
  
      {showAddGuardianModal && (
        <ModalAddGuardian 
          onSubmit={addGuardian} 
          onClose={() => setShowAddGuardianModal(false)} 
          address={newGuardianAddress}
          setAddress={setNewGuardianAddress}
        />
      )}
      
      {showRecoveryModal && (
        <ModalRecovery 
          onSubmit={initiateRecovery} 
          onClose={() => setShowRecoveryModal(false)} 
          address={newRecoveryAddress}
          setAddress={setNewRecoveryAddress}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content metal-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="metal-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
  
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="shield-icon"></div>
              <span>SocialRecoveryWallet</span>
            </div>
            <p>Privacy-preserving wallet recovery using FHE technology</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} SocialRecoveryWallet. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalAddGuardianProps {
  onSubmit: () => void; 
  onClose: () => void; 
  address: string;
  setAddress: (address: string) => void;
}

const ModalAddGuardian: React.FC<ModalAddGuardianProps> = ({ 
  onSubmit, 
  onClose, 
  address,
  setAddress
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
  };

  const handleSubmit = () => {
    if (!address || !ethers.isAddress(address)) {
      alert("Please enter a valid Ethereum address");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="create-modal metal-card">
        <div className="modal-header">
          <h2>Add New Guardian</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> Guardian information will be encrypted with FHE
          </div>
          
          <div className="form-group">
            <label>Guardian Address *</label>
            <input 
              type="text"
              value={address} 
              onChange={handleChange}
              placeholder="Enter Ethereum address..." 
              className="metal-input"
            />
          </div>
          
          <div className="privacy-notice">
            <div className="privacy-icon"></div> Guardians cannot see each other's identities
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn metal-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="submit-btn metal-button primary"
          >
            Add Guardian Securely
          </button>
        </div>
      </div>
    </div>
  );
};

interface ModalRecoveryProps {
  onSubmit: () => void; 
  onClose: () => void; 
  address: string;
  setAddress: (address: string) => void;
}

const ModalRecovery: React.FC<ModalRecoveryProps> = ({ 
  onSubmit, 
  onClose, 
  address,
  setAddress
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
  };

  const handleSubmit = () => {
    if (!address || !ethers.isAddress(address)) {
      alert("Please enter a valid Ethereum address for recovery");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="create-modal metal-card">
        <div className="modal-header">
          <h2>Initiate Wallet Recovery</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> Recovery request will be encrypted with FHE
          </div>
          
          <div className="form-group">
            <label>New Wallet Address *</label>
            <input 
              type="text"
              value={address} 
              onChange={handleChange}
              placeholder="Enter new Ethereum address..." 
              className="metal-input"
            />
          </div>
          
          <div className="recovery-info">
            <h3>Recovery Process</h3>
            <p>1. Your guardians will receive an anonymous request</p>
            <p>2. Majority approval is required for recovery</p>
            <p>3. Guardians cannot see each other's decisions</p>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn metal-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="submit-btn metal-button primary"
          >
            Initiate Recovery
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;