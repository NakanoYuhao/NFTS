// ============================================================
// NFT 合约配置 — ABI + 字节码 + 合约元信息
//
// 本模块定义了 OPEN-NFTs 平台使用的 ERC-721 合约接口。
// 支持两种模式：
//   1. 内置合约：使用自带的 OpenNFT.sol，前端可直接部署
//   2. 外部合约：用户已有区块链网络和智能合约，通过环境变量配置
//
// 外部合约适配（环境变量）：
//   - NEXT_PUBLIC_NFT_CONTRACT_ADDRESS: 合约地址
//   - NEXT_PUBLIC_CHAIN_ID: 链 ID
//   - NEXT_PUBLIC_CHAIN_NAME: 链名称
//   - NEXT_PUBLIC_CHAIN_RPC_URL: RPC 节点 URL
//   - NEXT_PUBLIC_CHAIN_BLOCK_EXPLORER: 区块浏览器 URL
//   - NEXT_PUBLIC_CHAIN_NATIVE_CURRENCY_NAME: 原生代币名称
//   - NEXT_PUBLIC_CHAIN_NATIVE_CURRENCY_SYMBOL: 原生代币符号
//   - NEXT_PUBLIC_NFT_MINT_FUNCTION: 铸造函数名（默认 safeMint）
//   - NEXT_PUBLIC_DID_METHOD: DID 方法名（默认 did:onft）
// ============================================================

import type { Abi } from 'viem';

// ============================================================
// 合约 ABI — 交互用（safeMint + ERC-721 只读）
// ============================================================

/**
 * OPEN-NFTs ERC-721 合约 ABI（交互用）
 */
export const OPEN_NFT_ABI: Abi = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'uri', type: 'string' },
    ],
    name: 'safeMint',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'approved', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'operator', type: 'address' },
      { indexed: false, name: 'approved', type: 'bool' },
    ],
    name: 'ApprovalForAll',
    type: 'event',
  },
];

// ============================================================
// 合约 ABI — 部署用（含 constructor）
// ============================================================

/**
 * 部署用完整 ABI（含 constructor 定义）
 */
export const OPEN_NFT_DEPLOY_ABI: Abi = [
  {
    inputs: [
      { internalType: 'string', name: 'name_', type: 'string' },
      { internalType: 'string', name: 'symbol_', type: 'string' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  ...OPEN_NFT_ABI,
];

// ============================================================
// 合约字节码（预编译，Solidity ^0.8.20）
// ============================================================

/**
 * OpenNFT 合约编译后的部署字节码
 * 来源：contracts/OpenNFT.sol (Solidity 0.8.23)
 * 编译器：solcjs 0.8.23
 */
export const OPEN_NFT_BYTECODE =
  '0x608060405234801561000f575f5ffd5b50604051611c3f380380611c3f833981810160405281019061003191906101ec565b815f908161003f9190610483565b50806001908161004f9190610483565b503360035f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555060016002819055505050610552565b5f604051905090565b5f5ffd5b5f5ffd5b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b6100fe826100b8565b810181811067ffffffffffffffff8211171561011d5761011c6100c8565b5b80604052505050565b5f61012f61009f565b905061013b82826100f5565b919050565b5f67ffffffffffffffff82111561015a576101596100c8565b5b610163826100b8565b9050602081019050919050565b8281835e5f83830152505050565b5f61019061018b84610140565b610126565b9050828152602081018484840111156101ac576101ab6100b4565b5b6101b7848285610170565b509392505050565b5f82601f8301126101d3576101d26100b0565b5b81516101e384826020860161017e565b91505092915050565b5f5f60408385031215610202576102016100a8565b5b5f83015167ffffffffffffffff81111561021f5761021e6100ac565b5b61022b858286016101bf565b925050602083015167ffffffffffffffff81111561024c5761024b6100ac565b5b610258858286016101bf565b9150509250929050565b5f81519050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f60028204905060018216806102b057607f821691505b6020821081036102c3576102c261026c565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f600883026103257fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff826102ea565b61032f86836102ea565b95508019841693508086168417925050509392505050565b5f819050919050565b5f819050919050565b5f61037361036e61036984610347565b610350565b610347565b9050919050565b5f819050919050565b61038c83610359565b6103a06103988261037a565b8484546102f6565b825550505050565b5f5f905090565b6103b76103a8565b6103c2818484610383565b505050565b5f5b828110156103e8576103dd5f8284016103af565b6001810190506103c9565b505050565b601f82111561043b578282111561043a57610407816102c9565b610410836102db565b610419856102db565b6020861015610426575f90505b808301610435828403826103c7565b505050505b5b505050565b5f82821c905092915050565b5f61045b5f1984600802610440565b1980831691505092915050565b5f610473838361044c565b9150826002028217905092915050565b61048c82610262565b67ffffffffffffffff8111156104a5576104a46100c8565b5b6104af8254610299565b6104ba8282856103ed565b5f60209050601f8311600181146104eb575f84156104d9578287015190505b6104e38582610468565b86555061054a565b601f1984166104f9866102c9565b5f5b82811015610520578489015182556001820191506020850194506020810190506104fb565b8683101561053d5784890151610539601f89168261044c565b8355505b6001600288020188555050505b505050505050565b6116e08061055f5f395ff3fe608060405234801561000f575f5ffd5b506004361061009c575f3560e01c80638da5cb5b116100645780638da5cb5b1461015857806395d89b4114610176578063c87b56dd14610194578063d204c45e146101c4578063f2fde38b146101f45761009c565b806306fdde03146100a057806318160ddd146100be57806323b872dd146100dc5780636352211e146100f857806370a0823114610128575b5f5ffd5b6100a8610210565b6040516100b59190610c85565b60405180910390f35b6100c661029b565b6040516100d39190610cbd565b60405180910390f35b6100f660048036038101906100f19190610d6b565b6102b0565b005b610112600480360381019061010d9190610dbb565b6105d4565b60405161011f9190610df5565b60405180910390f35b610142600480360381019061013d9190610e0e565b610680565b60405161014f9190610cbd565b60405180910390f35b610160610734565b60405161016d9190610df5565b60405180910390f35b61017e610759565b60405161018b9190610c85565b60405180910390f35b6101ae60048036038101906101a99190610dbb565b6107e5565b6040516101bb9190610c85565b60405180910390f35b6101de60048036038101906101d99190610f65565b610924565b6040516101eb9190610cbd565b60405180910390f35b61020e60048036038101906102099190610e0e565b610ad5565b005b5f805461021c90610fec565b80601f016020809104026020016040519081016040528092919081815260200182805461024890610fec565b80156102935780601f1061026a57610100808354040283529160200191610293565b820191905f5260205f20905b81548152906001019060200180831161027657829003601f168201915b505050505081565b5f60016002546102ab9190611049565b905090565b8273ffffffffffffffffffffffffffffffffffffffff1660045f8381526020019081526020015f205f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff161461034e576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610345906110c6565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036103bc576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103b39061112e565b60405180910390fd5b8273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480610442575060035f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16145b610481576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161047890611196565b60405180910390fd5b60055f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8154809291906104ce906111b4565b919050555060055f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f815480929190610520906111db565b91905055508160045f8381526020019081526020015f205f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550808273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef60405160405180910390a4505050565b5f5f60045f8481526020019081526020015f205f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690505f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603610677576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161066e9061126c565b60405180910390fd5b80915050919050565b5f5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036106ef576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016106e6906112d4565b60405180910390fd5b60055f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050919050565b60035f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6001805461076690610fec565b80601f016020809104026020016040519081016040528092919081815260200182805461079290610fec565b80156107dd5780601f106107b4576101008083540402835291602001916107dd565b820191905f5260205f20905b8154815290600101906020018083116107c057829003601f168201915b505050505081565b60605f73ffffffffffffffffffffffffffffffffffffffff1660045f8481526020019081526020015f205f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1603610885576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161087c90611366565b60405180910390fd5b5f8381526020019081526020015f20805461089f90610fec565b80601f01602080910402602001604051908101604052809291908181526020018280546108cb90610fec565b80156109165780601f106108ed57610100808354040283529160200191610916565b820191905f5260205f20905b8154815290600101906020018083116108f957829003601f168201915b5050505050905092915050565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610994576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161098b906113f4565b60405180910390fd5b3360035f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508160045f8581526020019081526020015f205f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550600160055f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054610a6d9190611049565b60055f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550818273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef60405160405180910390a4505050565b5f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603610b45576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b3c90611482565b60405180910390fd5b60035f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550565b5f604051905090565b5f5ffd5b5f5ffd5b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b610bea82610ba4565b810181811067ffffffffffffffff82111715610c0957610c08610bb4565b5b80604052505050565b5f610c1b610b8b565b9050610c278282610be1565b919050565b5f67ffffffffffffffff821115610c4657610c45610bb4565b5b610c4f82610ba4565b9050602081019050919050565b8281835e5f83830152505050565b5f610c7c610c7784610c2c565b610c12565b905082815260208101848484011115610c9857610c97610ba0565b5b610ca3848285610c5c565b509392505050565b5f819050919050565b5f610ccc610cc784610cae565b610350565b9050919050565b610cdc81610cc2565b82525050565b5f81519050919050565b5f82825260208201905092915050565b5f5f5f5f610d0584610ce2565b90505f836014811115610d1a57610d19610bb4565b5b60148101915081141591505b50915091565b5f610d368383610cf3565b905092915050565b5f610d4982610cae565b9050919050565b610d5981610d3f565b8114610d64575f5ffd5b50565b5f5f60408385031215610d7d57610d7c610b87565b5b5f610d8a85828601610d4d565b9250506020610d9b85828601610d4d565b9150509250929050565b5f5f5f60608386031215610dbc57610dbb610b87565b5b5f610dc986828701610d4d565b9350506020610dda86828701610d4d565b9250506040610deb86828701610d4d565b9150509250925092565b5f610dff82610cae565b9050919050565b610e0f81610df4565b82525050565b5f5f60408385031215610e2957610e28610b87565b5b5f610e3685828601610d4d565b9250506020610e4785828601610d4d565b9150509250929050565b5f5ffd5b5f5ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b5f5ffd5b610e8f82610ba4565b810181811067ffffffffffffffff82111715610eae57610ead610bb4565b5b80604052505050565b5f610ec0610b8b565b9050610ecc8282610e86565b919050565b5f67ffffffffffffffff821115610eeb57610eea610bb4565b5b610ef482610ba4565b9050602081019050919050565b5f610f11610f0c84610ed1565b610e12565b905082815260208101848484011115610f2d57610f2c610ba0565b5b610f38848285610c5c565b509392505050565b5f82601f830112610f5457610f53610b9c565b5b8151610f64848260208601610eff565b91505092915050565b5f5f60408385031215610f8357610f82610b87565b5b5f610f9085828601610d4d565b925050602083015167ffffffffffffffff811115610fb157610fb0610b8b565b5b610fbd85828601610f40565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6001820290505f82158061100c57508261100c82610fcc565b1480611043575081600281111561102357611022610e51565b5b602002905f91505f91505f84146110425761103b83610cc2565b9050611043565b5b50915091565b5f61105582610cae565b915061106083610cae565b925082820190508082111561107957611078610e51565b5b92915050565b7f5472616e7366657220746f6b656e206973206e6f74206f776e6572206f72206e6040517f6f7420617574686f72697a65640000000000000000000000000000000000000081526020015b60405180910390fd5b7f43616e6e6f74207472616e7366657220746f207a65726f2061646472657373005f82015250565b5f61113d601f83610cf3565b9150611148826110e4565b602082019050919050565b5f6020820190508181035f83015261116a81611131565b9050919050565b7f4e6f7420617574686f72697a65640000000000000000000000000000000000005f82015250565b5f6111a5600e83610cf3565b91506111b082611175565b602082019050919050565b5f6020820190508181035f8301526111d281611199565b9050919050565b5f6111e382610cae565b91505f82036111f5576111f4610e51565b5b600182039050919050565b5f61120a82610cae565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361123c5761123b610e51565b5b600182019050919050565b7f546f6b656e20646f6573206e6f742065786973740000000000000000000000005f82015250565b5f61127b601483610cf3565b915061128682611247565b602082019050919050565b5f6020820190508181035f8301526112a881611274565b9050919050565b7f5a65726f206164647265737320717565727900000000000000000000000000005f82015250565b5f6112e3601283610cf3565b91506112ee826112af565b602082019050919050565b5f6020820190508181035f830152611310816112d7565b9050919050565b7f43616e6e6f74206d696e7420746f207a65726f206164647265737300000000005f82015250565b5f61134b601b83610cf3565b915061135682611317565b602082019050919050565b5f6020820190508181035f8301526113788161133f565b9050919050565b7f596f7520617265206e6f742074686520746f6b656e206f776e657200000000005f82015250565b5f6113b3601c83610cf3565b91506113be82611385565b602082019050919050565b5f6020820190508181035f8301526113e0816113a7565b9050919050565b7f596f7520617265206e6f742074686520636f6e7472616374206f776e657200005f82015250565b5f61141d601f83610cf3565b9150611428826113ef565b602082019050919050565b5f6020820190508181035f83015261144a81611411565b9050919050565b7f43616e6e6f74207472616e7366657220746f207a65726f2061646472657373005f82015250565b5f611485601f83610cf3565b915061149082611451565b602082019050919050565b5f6020820190508181035f8301526114b281611479565b905091905056fea264697066735822122075f8ddbc77961e31d2d831785061a7a39d63673ac9a0b2dd7f68a49ceab5cf8764736f6c63430008230033';

// ============================================================
// 合约地址管理（环境变量 + localStorage 双重来源）
// ============================================================

const STORAGE_KEY = 'open-nft-contract-address';
const STORAGE_CHAIN_KEY = 'open-nft-contract-chain';

/**
 * 获取合约地址（前端用）
 * 优先级：环境变量 > localStorage
 */
export function getContractAddress(): `0x${string}` | undefined {
  // 1. 环境变量优先
  const envAddr = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
  if (envAddr && /^0x[a-fA-F0-9]{40}$/.test(envAddr)) {
    return envAddr as `0x${string}`;
  }
  // 2. localStorage（浏览器端）
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && /^0x[a-fA-F0-9]{40}$/.test(stored)) {
      return stored as `0x${string}`;
    }
  }
  return undefined;
}

/**
 * 保存合约地址到 localStorage
 * 部署成功后自动调用
 */
export function saveContractAddress(address: string, chainId?: number): void {
  if (typeof window !== 'undefined' && /^0x[a-fA-F0-9]{40}$/.test(address)) {
    localStorage.setItem(STORAGE_KEY, address);
    if (chainId) {
      localStorage.setItem(STORAGE_CHAIN_KEY, String(chainId));
    }
  }
}

/**
 * 清除 localStorage 中的合约地址
 */
export function clearContractAddress(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_CHAIN_KEY);
  }
}

/**
 * 检查合约是否已配置（前端用）
 */
export function isContractConfigured(): boolean {
  return !!getContractAddress();
}

/**
 * 获取服务端合约地址（读取非 PUBLIC 环境变量，优先 NEXT_PUBLIC_）
 */
export function getServerContractAddress(): `0x${string}` | undefined {
  const addr =
    process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS ||
    process.env.NFT_CONTRACT_ADDRESS;
  if (!addr) return undefined;
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    return undefined;
  }
  return addr as `0x${string}`;
}

// ============================================================
// 链配置
// ============================================================

export interface ChainConfig {
  chainId: number;
  name: string;
  network: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  faucetUrl?: string;
}

/** Hardhat 本地链配置（与二创监管平台共享） */
export const HARDHAT_LOCAL: ChainConfig = {
  chainId: 1337,
  name: 'NFC Trendy Guard Local',
  network: 'hardhat-local',
  blockExplorer: '',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrl: 'http://127.0.0.1:8545',
};

/** Polygon Amoy 测试网配置 */
export const POLYGON_AMOY: ChainConfig = {
  chainId: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  blockExplorer: 'https://amoy.polygonscan.com',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrl: 'https://rpc-amoy.polygon.technology',
  faucetUrl: 'https://faucet.polygon.technology/',
};

/** Polygon 主网配置 */
export const POLYGON_MAINNET: ChainConfig = {
  chainId: 137,
  name: 'Polygon',
  network: 'polygon',
  blockExplorer: 'https://polygonscan.com',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'POL',
    decimals: 18,
  },
  rpcUrl: 'https://polygon-rpc.com',
};

/**
 * 根据环境变量获取当前链配置
 * 支持外部区块链网络：通过 NEXT_PUBLIC_CHAIN_* 环境变量配置任意链
 */
export function getCurrentChainConfig(): ChainConfig {
  // 1. 优先使用外部链配置（用户已有区块链网络）
  const externalRpcUrl = process.env.NEXT_PUBLIC_CHAIN_RPC_URL;
  const externalChainId = process.env.NEXT_PUBLIC_CHAIN_ID;
  if (externalRpcUrl && externalChainId) {
    return {
      chainId: parseInt(externalChainId, externalChainId.startsWith('0x') ? 16 : 10),
      name: process.env.NEXT_PUBLIC_CHAIN_NAME || `Custom Chain ${externalChainId}`,
      network: process.env.NEXT_PUBLIC_CHAIN_NETWORK || `custom-${externalChainId}`,
      blockExplorer: process.env.NEXT_PUBLIC_CHAIN_BLOCK_EXPLORER || '',
      nativeCurrency: {
        name: process.env.NEXT_PUBLIC_CHAIN_NATIVE_CURRENCY_NAME || 'Native Token',
        symbol: process.env.NEXT_PUBLIC_CHAIN_NATIVE_CURRENCY_SYMBOL || 'ETH',
        decimals: 18,
      },
      rpcUrl: externalRpcUrl,
      faucetUrl: process.env.NEXT_PUBLIC_CHAIN_FAUCET_URL,
    };
  }

  // 2. 内置链配置
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;
  if (chainId === '0x89' || chainId === '137') {
    return POLYGON_MAINNET;
  }
  if (chainId === '0x1f41' || chainId === '80002') {
    return POLYGON_AMOY;
  }
  // 默认使用 Hardhat 本地链（与二创监管平台共享，chainId=1337）
  return HARDHAT_LOCAL;
}

/**
 * 获取铸造函数名（适配不同合约的 mint 函数签名）
 * 默认 safeMint(to, uri)，可通过 NEXT_PUBLIC_NFT_MINT_FUNCTION 覆盖
 */
export function getMintFunctionName(): string {
  return process.env.NEXT_PUBLIC_NFT_MINT_FUNCTION || 'safeMint';
}

/**
 * 获取 DID 方法名
 * 默认 did:onft，可通过 NEXT_PUBLIC_DID_METHOD 覆盖
 */
export function getDidMethod(): string {
  return process.env.NEXT_PUBLIC_DID_METHOD || 'did:onft';
}

// ============================================================
// 浏览器链接生成
// ============================================================

export function getTxExplorerUrl(txHash: string, chain?: ChainConfig): string {
  const c = chain || getCurrentChainConfig();
  return `${c.blockExplorer}/tx/${txHash}`;
}

export function getAddressExplorerUrl(
  address: string,
  chain?: ChainConfig,
): string {
  const c = chain || getCurrentChainConfig();
  return `${c.blockExplorer}/address/${address}`;
}

export function getTokenExplorerUrl(
  contractAddress: string,
  tokenId: string,
  chain?: ChainConfig,
): string {
  const c = chain || getCurrentChainConfig();
  return `${c.blockExplorer}/token/${contractAddress}?a=${tokenId}`;
}
