import { ActorSubclass } from "@dfinity/agent";
import { html, render } from "lit-html";
import { init } from "../index";
import { _SERVICE } from "../did";
import idlFactory from "../did";
import { IC } from "@astrox/connection";

const content = () => html`<div class="container">
  <style>
    #whoami {
      border: 1px solid #1a1a1a;
      margin-bottom: 1rem;
    }
  </style>
  <h1>Internet Identity Client</h1>
  <h2>You are authenticated!</h2>
  <p>To see how a canister views you, click this button!</p>
  <button type="button" id="whoamiButton" class="primary">Who am I?</button>
  <input type="text" readonly id="whoami" placeholder="your Identity" />
  <button id="create">createActor</button>
  <button id="logout">log out</button>
</div>`;

export const renderLoggedIn = (
  actor: ActorSubclass<_SERVICE> | undefined,
  authClient: IC
) => {
  render(content(), document.getElementById("pageContent") as HTMLElement);

  (document.getElementById("whoamiButton") as HTMLButtonElement).onclick =
    async () => {
      // try {
      //   const response = await actor.whoami();
      //   console.log(response);
      //   (document.getElementById("whoami") as HTMLInputElement).value =
      //     response.toString();
      // } catch (error) {
      //   console.error(error);
      // }
    };

  (document.getElementById("create") as HTMLButtonElement).onclick =
    async () => {
      console.log('11111')
      await (authClient as IC).createActor(idlFactory, 
        // process.env.CANISTER_ID as string
        'qsgjb-riaaa-aaaaa-aaaga-cai'
      );
    };

  (document.getElementById("logout") as HTMLButtonElement).onclick =
    async () => {
      await (authClient as IC).disconnect();
      await init();
    };
};
