# Marley Spoon API JavaScript client

Fetch nutrition information of recipes from Marley Spoon.

## Usage

1. Log into your Marley Spoon account and open the developer console in your browser
2. Fetch the `remember_spree_user_token` cookie value
3. Replace `process.env.remember_spree_user_token` with the value of the cookie in [the usage reference](https://github.com/ViMaSter/marleyspoon-api/blob/main/client.test.js#L5C7-L27)

## Running tests

1. Log into your Marley Spoon account and open the developer console in your browser
2. Fetch the `remember_spree_user_token` cookie value
3. Create a `.env` file in the root directory of the project with the following content:  
   `remember_spree_user_token="<your_cookie_value>"`
4. Run `nvm i && nvm use && npm i`
5. Run `npm run test`
