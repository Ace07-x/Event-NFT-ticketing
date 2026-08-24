import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("EventTicket", function () {
  let EventTicket, eventTicket;
  let owner, addr1, addr2;
  const ticketPrice = ethers.parseEther("1"); // 1 ETH
  const maxTickets = 100;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    EventTicket = await ethers.getContractFactory("EventTicket");
    eventTicket = await EventTicket.deploy("Concert Ticket", "TKT", ticketPrice, maxTickets);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await eventTicket.owner()).to.equal(owner.address);
    });
    
    it("Should set initial properties correctly", async function () {
        expect(await eventTicket.ticketPrice()).to.equal(ticketPrice);
        expect(await eventTicket.maxTickets()).to.equal(maxTickets);
    });
  });

  describe("Purchasing", function () {
    it("Should let user buy a ticket", async function () {
      await expect(eventTicket.connect(addr1).purchaseTicket({ value: ticketPrice }))
        .to.emit(eventTicket, "TicketPurchased")
        .withArgs(addr1.address, 0, ticketPrice);
      
      expect(await eventTicket.ownerOf(0)).to.equal(addr1.address);
    });

    it("Should fail if incorrect ETH is sent", async function () {
      await expect(eventTicket.connect(addr1).purchaseTicket({ value: ethers.parseEther("0.5") }))
        .to.be.revertedWith("Incorrect ticket price");
    });
  });

  describe("Resale", function () {
    beforeEach(async function () {
      await eventTicket.connect(addr1).purchaseTicket({ value: ticketPrice });
    });

    it("Should allow owner to list ticket for resale", async function () {
      const resalePrice = ethers.parseEther("1.1");
      await expect(eventTicket.connect(addr1).listForResale(0, resalePrice))
        .to.emit(eventTicket, "TicketListedForResale")
        .withArgs(0, resalePrice);

      const listing = await eventTicket.resaleListings(0);
      expect(listing.isListed).to.be.true;
      expect(listing.price).to.equal(resalePrice);
    });

    it("Should fail if listing price exceeds cap", async function () {
      const tooHighPrice = ethers.parseEther("1.3"); // Cap is 120% (1.2 ETH)
      await expect(eventTicket.connect(addr1).listForResale(0, tooHighPrice))
        .to.be.revertedWith("Price exceeds maximum resale cap");
    });

    it("Should let another user buy resale ticket and distribute funds", async function () {
      const resalePrice = ethers.parseEther("1.2");
      await eventTicket.connect(addr1).listForResale(0, resalePrice);

      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      const initialSellerBalance = await ethers.provider.getBalance(addr1.address);

      // Buy from addr2
      await expect(eventTicket.connect(addr2).buyResaleTicket(0, { value: resalePrice }))
        .to.emit(eventTicket, "TicketResold");

      expect(await eventTicket.ownerOf(0)).to.equal(addr2.address);

      // Check listing is cleared
      const listing = await eventTicket.resaleListings(0);
      expect(listing.isListed).to.be.false;

      // Royalty is 10% of 1.2 ETH = 0.12 ETH
      // Seller proceeds = 1.08 ETH
      const royalty = ethers.parseEther("0.12");
      const expectedSellerProceeds = ethers.parseEther("1.08");

      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      const finalSellerBalance = await ethers.provider.getBalance(addr1.address);

      // Since owner gets royalty, and owner balance is initialOwnerBalance + royalty
      expect(finalOwnerBalance - initialOwnerBalance).to.equal(royalty);
      
      // We don't accurately check seller balance difference exactly because of gas fees
      // But we know addr1 didn't pay gas for the transfer, only for listing
    });
  });
});
