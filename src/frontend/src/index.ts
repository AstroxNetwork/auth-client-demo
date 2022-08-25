import idlFactory from "./did";
import type { _SERVICE } from "./did";
import { renderIndex } from "./views";
import { renderLoggedIn } from "./views/loggedIn";
import { IC } from "@astrox/connection";
import { PermissionsType } from "@astrox/connection/lib/cjs/types";

export const IcObject = async () => {
  return await IC.create({
    onAuthenticated: (icInstance: IC) => {
      console.log(icInstance)
      console.log(window)
    },
  })
} ;



export const init = async () => {

  await renderIndex();
  await initBody();
};

export const initBody = async () => {
  const loginButton = document.getElementById(
    "loginButton"
  ) as HTMLButtonElement;

  let ICIndance: IC;

  loginButton.onclick = async () => {
    await (await IcObject()).connect({
      useFrame: !(window.innerWidth < 768),
      appId: process.env.CANISTER_ID!,
      identityProvider: process.env.isProduction
        ? "https://i3z5x-xaaaa-aaaah-aa2za-cai.raw.ic0.app/anthen/login#authorize" // 'https://identity.ic0.app/#authorize'
        : process.env.LOCAL_ME_CANISTER,
      permissions: [PermissionsType.identity, PermissionsType.wallet],
      delegationTargets: ['qsgjb-riaaa-aaaaa-aaaga-cai'],
      onAuthenticated: async (thisIc) => {
        // const whoami_actor = thisIc.createActor<_SERVICE>(
        //   idlFactory,
        //   'qsgjb-riaaa-aaaaa-aaaga-cai'
        // );
        // ICIndance = thisIc
        renderLoggedIn(undefined, thisIc);
      },
    });
  };

  const loginButton2 = document.getElementById(
    "loginButton2"
  ) as HTMLButtonElement;

  loginButton2.onclick = async () => {
    console.log('ICIndance', ICIndance, process.env.CANISTER_ID as string)
    // ICIndance.createActor(idlFactory, process.env.CANISTER_ID as string)
    // await (await IcObject()).connect({
    //   useFrame: !(window.innerWidth < 768),
    //   appId: process.env.CANISTER_ID!,
    //   identityProvider: process.env.isProduction
    //     ? "https://6z4l5-ciaaa-aaaah-aazcq-cai.raw.ic0.app/#authorize" // 'https://identity.ic0.app/#authorize'
    //     : process.env.LOCAL_II_CANISTER,
    //   permissions: [PermissionsType.identity, PermissionsType.wallet],
    //   delegationTargets: [],
    //   onAuthenticated: async (thisIc: IC) => {
    //     const whoami_actor = await thisIc.createActor<_SERVICE>(
    //       idlFactory,
    //       process.env.CANISTER_ID as string
    //     );
    //     // @ts-ignore
    //     renderLoggedIn(whoami_actor, thisIc);
    //   },
    // });
  };
};

init();
