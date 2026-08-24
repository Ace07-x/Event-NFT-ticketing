import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const EventTicket = await ethers.getContractFactory("EventTicket");
  const eventTicket = EventTicket.attach(contractAddress);

  const [signer] = await ethers.getSigners();
  console.log("Minting to:", signer.address);

  const tx = await eventTicket.purchaseTicket(0, "ipfs://QmGeneral...", { value: ethers.parseEther("0.01") });
  const receipt = await tx.wait();

  let mintedTokenId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = eventTicket.interface.parseLog(log);
      if (parsed && parsed.name === 'TicketPurchased') {
        mintedTokenId = parsed.args.tokenId.toString();
        break;
      }
    } catch (e) {}
  }

  console.log("Success! Minted Token ID:", mintedTokenId);
}

main().catch(console.error);
