# Auth-Client Demo

This is an example project, intended to demonstrate how an app developer might integrate with an [Internet Identity](https://identity.ic0.app).

Also, this is a demo used for interacting with `agent_dart`, because Internet Identity currently only supports passing message via browser window. Hence we can not use normal native authorization flow eg: `callback_uri` directly.

We have to generate a plain new webpage, and **IMPORTANT** to deploy it to the IC, the url should be the same origin to your main frontend canister, to give you correct delegation identity from II.
Use the example to deploy to your local environment.

## Setting up for local development

To get started, start a local dfx development environment in this directory with the following steps:

```bash
cd auth-client-demo/
dfx start --background
dfx deploy
```

Then, make sure you have the [Internet Identity](https://github.com/dfinity/internet-identity) repo cloned locally. 

```bash
cd ../internet-identity
II_ENV=development dfx deploy --no-wallet --argument '(null)'
```

Copy the canister ID fom the Internet Identity canister, and paste it into `webpack.config.js` in this project on the `LOCAL_II_CANISTER` variable on line `8`.

Finally, cd back into the auth-client-demo directory and start the development server with `npm start`.

You can now access the app at `http://localhost:8080`.


## Setting up for flutter `auth-client` flow

TODO