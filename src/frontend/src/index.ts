import idlFactory from "./did";
import type { _SERVICE } from "./did";
import { renderIndex } from "./views";
import { renderLoggedIn } from "./views/loggedIn";
import { IC } from "@astrox/connection";
import { PermissionsType } from "@astrox/connection/lib/cjs/types";

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
    const sss = await IC.connect({
      appId: process.env.CANISTER_ID!,
      identityProvider: process.env.isProduction
        ? "https://63k2f-nyaaa-aaaah-aakla-cai.raw.ic0.app/#authorize" // 'https://identity.ic0.app/#authorize'
        : process.env.LOCAL_ME_CANISTER,
      permissions: [PermissionsType.identity, PermissionsType.wallet],
      onAuthenticated: async (thisIc) => {
        const whoami_actor = thisIc.createActor<_SERVICE>(
          idlFactory,
          process.env.CANISTER_ID as string
        );
        renderLoggedIn(whoami_actor, thisIc);
      },
    });
    console.log({ sss });
  };

  const loginButton2 = document.getElementById(
    "loginButton2"
  ) as HTMLButtonElement;

  loginButton2.onclick = async () => {
    const sss = await IC.connect({
      appId: process.env.CANISTER_ID!,
      identityProvider: process.env.isProduction
        ? "https://6z4l5-ciaaa-aaaah-aazcq-cai.raw.ic0.app/#authorize" // 'https://identity.ic0.app/#authorize'
        : process.env.LOCAL_II_CANISTER,
      permissions: [PermissionsType.identity, PermissionsType.wallet],
      onAuthenticated: async (thisIc) => {
        const whoami_actor = thisIc.createActor<_SERVICE>(
          idlFactory,
          process.env.CANISTER_ID as string
        );
        renderLoggedIn(whoami_actor, thisIc);
      },
    });
    console.log({ sss });
  };
};

init();
