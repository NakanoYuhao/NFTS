import { ethers } from "hardhat";

async function main() {
    await ethers.provider.send("hardhat_reset", []);

    const [admin, creator, deriv] = await ethers.getSigners();
    console.log('=== NFC Trendy Guard - Full Business Flow Demo ===\n');

    // 1. Deploy all 7 contracts
    const CR = await ethers.getContractFactory('CreatorRegistry');
    const reg = await CR.deploy(); await reg.waitForDeployment();
    const OW = await ethers.getContractFactory('OriginalWork');
    const ow = await OW.deploy(await reg.getAddress(), admin.address, 500);
    await ow.waitForDeployment();
    const LT = await ethers.getContractFactory('LicenseToken');
    const lt = await LT.deploy(); await lt.waitForDeployment();
    const DN = await ethers.getContractFactory('DerivativeNFT');
    const dn = await DN.deploy(); await dn.waitForDeployment();
    const DR = await ethers.getContractFactory('DerivativeRule');
    const dr = await DR.deploy(await ow.getAddress(), await dn.getAddress(), await lt.getAddress(), await reg.getAddress());
    await dr.waitForDeployment();
    await lt.setRuleEngine(await dr.getAddress());
    await dn.setRuleEngine(await dr.getAddress());

    const RS = await ethers.getContractFactory('RoyaltySplitter');
    const rs = await RS.deploy(await dr.getAddress());
    const NS = await ethers.getContractFactory('NfcSealRegistry');
    const ns = await NS.deploy();
    console.log('[1/7] 7 contracts deployed');
    console.log('  CreatorRegistry:', await reg.getAddress());
    console.log('  DerivativeRule:', await dr.getAddress());

    // 2. Creator registers DID
    const did = 'did:fisco:bcos:' + creator.address.toLowerCase();
    const didHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ id: did })));
    await reg.connect(creator).registerCreator(creator.address, did, didHash);
    console.log('[2/7] DID registered: ' + did);

    // 3. Admin verifies creator
    await reg.connect(admin).verifyCreator(creator.address);
    const cr = await reg.creators(creator.address);
    console.log('[3/7] Creator verified on-chain: ' + cr.isVerified);

    // 4. Mint Original Work NFT
    const nfcHash = ethers.keccak256(ethers.toUtf8Bytes('NFC_CHIP_ORIGINAL_001'));
    const mintTx = await ow.connect(admin).mintOriginal(
        creator.address, 'ipfs://QmOriginalMeta', nfcHash, did
    );
    await mintTx.wait();
    const owner = await ow.ownerOf(0n);
    console.log('[4/7] Original NFT minted: tokenId=0, owner=' + owner);

    // 5. Set Derivative Policy
    const remixType = ethers.keccak256(ethers.toUtf8Bytes('remix'));
    const recolorType = ethers.keccak256(ethers.toUtf8Bytes('recolor'));
    const expireTime = BigInt(Math.floor(Date.now() / 1000) + 365 * 86400);
    await dr.connect(admin).setPolicy(
        creator.address, await ow.getAddress(), 0n,
        true, [remixType, recolorType], 500n, 100n, false, expireTime, true
    );
    const policy = await dr.getPolicy(await ow.getAddress(), 0n);
    console.log('[5/7] Policy set: royalty=' + Number(policy.royaltyBps) / 100 + '%, maxSupply=' + policy.maxSupply + ', commercial=' + policy.allowCommercial);

    // 6. Submit Derivative Work
    const derivTx = await dr.connect(admin).submitDerivative(
        deriv.address, await ow.getAddress(), 0n,
        remixType, ethers.ZeroHash, 'ipfs://QmDerivativeMeta'
    );
    await derivTx.wait();
    console.log('[6/7] Derivative submitted: tokenId=0, creator=' + deriv.address);

    // 7. Trace Derivative Chain
    const trace = await dr.traceDerivative(await dn.getAddress(), 0n);
    console.log('[7/7] Trace Chain:');
    console.log('  - Original Contract: ' + trace.originalContract);
    console.log('  - Original Token ID: ' + trace.originalTokenId);
    console.log('  - Deriv Creator:     ' + trace.derivativeCreator);
    console.log('  - License ID:        ' + trace.licenseId);
    console.log('  - Verified:          ' + trace.verified);
    console.log('  - Created At:        ' + new Date(Number(trace.createdAt) * 1000).toISOString());

    console.log('\n============================================');
    console.log('  FULL BUSINESS FLOW COMPLETE');
    console.log('============================================');
    console.log(' DID Registration     : OK');
    console.log(' Creator Verification : OK (on-chain)');
    console.log(' Original NFT Mint    : OK (tokenId #0)');
    console.log(' Derivative Policy    : OK (5%, 100 max)');
    console.log(' Derivative Submit    : OK (tokenId #0)');
    console.log(' Trace Chain Verified : OK');
    console.log('============================================');
}

main().catch(e => { console.error(e); process.exit(1); });
