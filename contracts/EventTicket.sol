// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EventTicket is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    enum TicketType { General, VIP }
    
    uint256 public generalPrice;
    uint256 public vipPrice;
    uint256 public maxTickets;
    
    uint256 public maxResaleMarkupPercentage = 120;
    uint256 public organizerRoyaltyPercentage = 10;
    
    struct ResaleListing {
        bool isListed;
        uint256 price;
    }
    
    mapping(uint256 => ResaleListing) public resaleListings;
    mapping(uint256 => uint256) public originalTicketPrices;
    mapping(uint256 => TicketType) public ticketTypes;

    // O(1) owner tracking - avoids StackOverflow on eth_call loops
    mapping(address => uint256[]) private _ownerTokens;
    mapping(uint256 => uint256) private _tokenIndexInOwner;

    event TicketPurchased(address indexed buyer, uint256 indexed tokenId, uint256 price);
    event TicketListedForResale(uint256 indexed tokenId, uint256 price);
    event TicketResold(address indexed seller, address indexed buyer, uint256 indexed tokenId, uint256 price, uint256 royalty);

    constructor(
        string memory name, 
        string memory symbol, 
        uint256 _generalPrice, 
        uint256 _vipPrice, 
        uint256 _maxTickets
    ) ERC721(name, symbol) Ownable(msg.sender) {
        generalPrice = _generalPrice;
        vipPrice = _vipPrice;
        maxTickets = _maxTickets;
    }

    // Maintain _ownerTokens on every transfer (mint, resale, burn)
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);

        // Remove from previous owner
        if (from != address(0)) {
            uint256 idx = _tokenIndexInOwner[tokenId];
            uint256 lastIdx = _ownerTokens[from].length - 1;
            if (idx != lastIdx) {
                uint256 lastToken = _ownerTokens[from][lastIdx];
                _ownerTokens[from][idx] = lastToken;
                _tokenIndexInOwner[lastToken] = idx;
            }
            _ownerTokens[from].pop();
        }

        // Add to new owner
        if (to != address(0)) {
            _tokenIndexInOwner[tokenId] = _ownerTokens[to].length;
            _ownerTokens[to].push(tokenId);
        }

        return from;
    }

    function purchaseTicket(TicketType ticketType, string memory uri) external payable {
        require(_nextTokenId < maxTickets, "Sold out");
        
        uint256 price = ticketType == TicketType.VIP ? vipPrice : generalPrice;
        require(msg.value == price, "Incorrect ticket price");

        uint256 tokenId = _nextTokenId++;
        originalTicketPrices[tokenId] = price;
        ticketTypes[tokenId] = ticketType;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit TicketPurchased(msg.sender, tokenId, price);
    }

    function getTotalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    // O(1) lookup - no loop, no StackOverflow
    function getTicketsByOwner(address _owner) external view returns (uint256[] memory) {
        return _ownerTokens[_owner];
    }

    function getTicketInfo(uint256 tokenId) external view returns (
        TicketType ticketType,
        uint256 originalPrice,
        address owner,
        string memory uri
    ) {
        require(tokenId < _nextTokenId, "Ticket does not exist");
        return (
            ticketTypes[tokenId],
            originalTicketPrices[tokenId],
            ownerOf(tokenId),
            tokenURI(tokenId)
        );
    }

    function listForResale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        
        uint256 maxPrice = (originalTicketPrices[tokenId] * maxResaleMarkupPercentage) / 100;
        require(price <= maxPrice, "Price exceeds maximum resale cap");

        resaleListings[tokenId] = ResaleListing({
            isListed: true,
            price: price
        });
        
        emit TicketListedForResale(tokenId, price);
    }

    function buyResaleTicket(uint256 tokenId) external payable {
        ResaleListing memory listing = resaleListings[tokenId];
        require(listing.isListed, "Ticket not listed for resale");
        require(msg.value == listing.price, "Incorrect price");

        address seller = ownerOf(tokenId);
        
        uint256 royalty = (msg.value * organizerRoyaltyPercentage) / 100;
        uint256 sellerProceeds = msg.value - royalty;

        delete resaleListings[tokenId];
        _transfer(seller, msg.sender, tokenId);

        (bool successSeller, ) = payable(seller).call{value: sellerProceeds}("");
        require(successSeller, "Seller transfer failed");
        
        (bool successOrganizer, ) = payable(owner()).call{value: royalty}("");
        require(successOrganizer, "Organizer royalty transfer failed");

        emit TicketResold(seller, msg.sender, tokenId, msg.value, royalty);
    }
    
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
    }
}
