import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("EventTicketModule", (m) => {
  // Define default parameters for the contract
  const name = m.getParameter("name", "Tech Conference 2026");
  const symbol = m.getParameter("symbol", "TECH26");
  
  // Default ticket prices (General: 0.01 ETH, VIP: 0.05 ETH)
  const generalPrice = m.getParameter("generalPrice", 10000000000000000n); // 0.01 ETH
  const vipPrice = m.getParameter("vipPrice", 50000000000000000n); // 0.05 ETH
  
  // Default maximum tickets
  const maxTickets = m.getParameter("maxTickets", 100);

  const eventTicket = m.contract("EventTicket", [
    name,
    symbol,
    generalPrice,
    vipPrice,
    maxTickets
  ]);

  return { eventTicket };
});
