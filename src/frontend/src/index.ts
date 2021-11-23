import { Actor, HttpAgent } from "@dfinity/agent";
import * as iiAuth from "@dfinity/auth-client";
import { IC, AuthClient } from "./auth-client";
import idlFactory from "./did";
import type { _SERVICE } from "./did";
import { renderIndex } from "./views";
import { renderLoggedIn } from "./views/loggedIn";

export const init = async () => {
  await renderIndex();
  await initBody();
};

export const initBody = async () => {
  const days = BigInt(1);
  const hours = BigInt(24);
  const nanoseconds = BigInt(3600000000000);
  const loginButton = document.getElementById(
    "loginButton"
  ) as HTMLButtonElement;
  loginButton.onclick = async () => {
    await IC.connect(
      {
        appId: process.env.CANISTER_ID!,
      },
      {
        onAuthenticated: async (thisIc) => {
          const whoami_actor = thisIc.createActor<_SERVICE>(
            idlFactory,
            process.env.CANISTER_ID as string
          );
          renderLoggedIn(whoami_actor, thisIc);
        },
      }
    );

    // console.log(await authClient.isAuthenticated());
    // if (await authClient.isAuthenticated()) {
    //   const whoami_actor = authClient.createActor<_SERVICE>(
    //     idlFactory,
    //     process.env.CANISTER_ID as string
    //   );
    //   renderLoggedIn(whoami_actor, authClient);
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

async function handleAuthenticated(authClient: iiAuth.AuthClient) {
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
