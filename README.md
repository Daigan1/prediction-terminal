# What the Project Does

Prediction Terminal is an all-in-one interface giving users access to aggregation of several markets, related news impacting markets, arbitrage opportunities across prediction market providers, clean and modern U.I, extreme customizability, and advanced user features including paper trading and backtesting. Prediction Terminal is *the* tool to provide insights and deeper knowledge into prediction markets for both power and average users.


# Features

- View prediction markets from three major exchanges [Gemini, Kalshi, Polymarket]
- See relevant articles from the news and related markets impacted
- Backtest orders to view possible profits or losses trading on the market
- Implement and test strategies using the paper trading feature on any market
- Resize, move, and close different views based on the information needed
- Use simple mode for a clean, full view of relevant information
- View arbitrage oppertunities and duplicate markets across different exchanges


# Gemini API Endpoints: 

The project uses the following endpoints:

- Place Order: https://docs.gemini.com/prediction-markets/trading#place-order

- Get Order History: https://docs.gemini.com/prediction-markets/positions#get-order-history

- List Prediction Market Events: https://docs.gemini.com/prediction-markets/trading#place-order

# How to Run

- Copy .env.local.example to .env.local
- Fill in env
- To run the dev server: npm run dev
- To build a production build: npm run build
- To run a production build: npm run start

# Tech Stack

- Next.js
- Typescript
- Supabase
- react-grid-layout + regrid

# Technicial Execution + Preventing User Slips

The Code follows proper style using types, concurrent processing for each of the markets, proper error handling, and informative errors for the user if any were to occur. There is also  prompts and warnings for live trading to ensure no funds are lost or misclicks occur.


# Known Limitations

None