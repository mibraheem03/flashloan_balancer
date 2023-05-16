const { ethers, JsonRpcProvider, WebSocketProvider } = require("ethers");
const uniswapV2ABIFactory = require("./abis/uniswapv2.json");
const uniswapV3ABIFactory = require("./abis/uniswapv3.json");
const uniswapV3PairABI = require("./abis/uniswapv3Pair.json");
const uniswapv2PairABI = require("./abis/uniswapv2Pair.json");
const erc20ABI = require("./abis/erc20.json");

const uniswapV3Quoter = require("./abis/uniswapQuoter.json");
const uniswapv2Router = require("./abis/uniswapV2Router.json");
const uniswapQouterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const uniswapV2RouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const TokenA = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT
const TokenB = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC

const PoolFee = "100";
const uniswapV2FactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const uniswapV3FactoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const NODE = "https://mainnet.infura.io/v3/571a476709e840489f546ce9b6b5544a";
const NODE_SOCKET = "wss://mainnet.infura.io/ws/v3/571a476709e840489f546ce9b6b5544a";
const provider = new JsonRpcProvider(NODE);
const TokenAmount = "1000000";
async function getPoolAddresssV3() {
  const uniswapv3FactoryContract = new ethers.Contract(uniswapV3FactoryAddress, uniswapV3ABIFactory, provider);
  const poolAddress = await uniswapv3FactoryContract.getPool(TokenA, TokenB, PoolFee);
  console.log(`Uniswap V3 Pair Address ${poolAddress}`);
  return poolAddress;
}
async function getPoolAddresssV2() {
  const uniswapv3FactoryContract = new ethers.Contract(uniswapV2FactoryAddress, uniswapV2ABIFactory, provider);
  const poolAddress = await uniswapv3FactoryContract.getPair(TokenA, TokenB);
  console.log(`Uniswap V2 Pair Address ${poolAddress}`);
  return poolAddress;
}
async function getTokenDecimals(tokenAddress) {
  const uniswapv3FactoryContract = new ethers.Contract(tokenAddress, erc20ABI, provider);
  const decimals = await uniswapv3FactoryContract.decimals();
  console.log(`Token ${tokenAddress} Decimals Are ${decimals}`);
  return Number(decimals);
}
(async () => {
  const pairAddressV3 = await getPoolAddresssV3();
  const pairAddressV2 = await getPoolAddresssV2();
  const poolContractV3 = new ethers.Contract(pairAddressV3, uniswapV3PairABI, provider);
  const poolContractV2 = new ethers.Contract(pairAddressV2, uniswapv2PairABI, provider);

  const uniswapQouterContract = new ethers.Contract(uniswapQouterAddress, uniswapV3Quoter, provider);
  const uniswapV2RouterContract = new ethers.Contract(uniswapV2RouterAddress, uniswapv2Router, provider);
  const tokenADecimals = await getTokenDecimals(TokenA);
  const tokenBDecimals = await getTokenDecimals(TokenB);

  var customWsProvider = new WebSocketProvider(NODE_SOCKET);
  customWsProvider.on("block", async (block) => {
    console.log(`eth Block # ${block}`);
    const path1 = [];
    // PATH USDT -> USDC || Token A -> Token B
    path1.push(uniswapV2RouterContract.getAmountsOut(TokenAmount, [TokenA, TokenB]));
    // Fetch Price on V3
    path1.push(uniswapQouterContract.quoteExactOutputSingle.staticCall(TokenA, TokenB, PoolFee, TokenAmount, 0));

    const resultPath1 = await Promise.all(path1);
    const tokenBPriceOnUniswapV2Buy = Number(String(resultPath1[0]).split(",")[1]) / 10 ** tokenBDecimals;
    const tokenBPriceOnUniswapV3Buy = Number(resultPath1[1]) / 10 ** tokenBDecimals;
    console.log(`Buy -- UniswapV2 ${tokenBPriceOnUniswapV2Buy} UniswapV3 ${tokenBPriceOnUniswapV3Buy}`);

    // Path USDC -> USDT || Token B -> Token A
    const path2 = [];
    path2.push(uniswapV2RouterContract.getAmountsIn(TokenAmount, [TokenA, TokenB]));
    path2.push(uniswapQouterContract.quoteExactInputSingle.staticCall(TokenA, TokenB, PoolFee, TokenAmount, 0));
    const resultPath2 = await Promise.all(path2);
    const tokenBPriceOnUniswapV2Sell = Number(String(resultPath2[0]).split(",")[0]) / 10 ** tokenBDecimals;
    const tokenBPriceOnUniswapV3Sell = Number(resultPath2[1]) / 10 ** tokenBDecimals;
    console.log(`Sell -- UniswapV2 ${tokenBPriceOnUniswapV2Sell} UniswapV3 ${tokenBPriceOnUniswapV3Sell}`);
  });
})();
