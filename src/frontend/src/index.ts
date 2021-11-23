import { Actor, HttpAgent } from "@dfinity/agent";
import * as iiAuth from "@dfinity/auth-client";
import { IC, AuthClient } from "./auth-client";
import idlFactory from "./did";
import type { _SERVICE } from "./did";
import { renderIndex } from "./views";
import { renderLoggedIn } from "./views/loggedIn";

const init = async () => {
  renderIndex();
  const days = BigInt(1);
  const hours = BigInt(24);
  const nanoseconds = BigInt(3600000000000);
  const loginButton = document.getElementById(
    "loginButton"
  ) as HTMLButtonElement;
  loginButton.onclick = async () => {
    const authClient = await IC.connect({
      appId: process.env.CANISTER_ID!,
    });
    // await authClient.login({
    //   onSuccess: async () => {
    //     handleAuthenticated(authClient);
    //   },
    //   identityProvider: process.env.isProduction
    //     ? "https://63k2f-nyaaa-aaaah-aakla-cai.raw.ic0.app/#authorize"
    //     : process.env.LOCAL_ME_CANISTER,
    //   maxTimeToLive: days * hours * nanoseconds,
    // });
    // if (await authClient.isAuthenticated()) {
    //   handleAuthenticated(authClient);
    // } else {
    //   return;
    // }
  };

  const loginButton2 = document.getElementById(
    "loginButton2"
  ) as HTMLButtonElement;
  loginButton2.onclick = async () => {
    const iiAuthClient = await iiAuth.AuthClient.create();

    await iiAuthClient.login({
      onSuccess: async () => {
        handleAuthenticated(iiAuthClient);
      },
      identityProvider: process.env.isProduction
        ? "https://6z4l5-ciaaa-aaaah-aazcq-cai.raw.ic0.app/#authorize" // 'https://identity.ic0.app/#authorize'
        : process.env.LOCAL_II_CANISTER,
      // Maximum authorization expiration is 8 days
      maxTimeToLive: days * hours * nanoseconds,
    });
    if (await iiAuthClient.isAuthenticated()) {
      handleAuthenticated(iiAuthClient);
    } else {
      return;
    }
  };
};

async function handleAuthenticated(authClient: AuthClient | iiAuth.AuthClient) {
  const identity = await authClient.getIdentity();

  const agent = new HttpAgent({ identity });
  console.log(identity);
  console.log(process.env.CANISTER_ID);
  console.log(process.env.isProduction);

  if (!process.env.isProduction) {
    await agent.fetchRootKey();
  }

  const whoami_actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: process.env.CANISTER_ID as string,
  });
  renderLoggedIn(whoami_actor, authClient);
}

init();
