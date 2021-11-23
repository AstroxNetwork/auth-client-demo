import { ActorSubclass } from "@dfinity/agent";
import { AuthClient, IC } from "../auth-client";
import * as iiAuth from "@dfinity/auth-client";
import { html, render } from "lit-html";
import { renderIndex } from ".";
import { init } from "../index";
import { _SERVICE } from "../did";

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
  <button id="logout">log out</button>
</div>`;

export const renderLoggedIn = (
  actor: ActorSubclass<_SERVICE>,
  authClient: IC | iiAuth.AuthClient
) => {
  render(content(), document.getElementById("pageContent") as HTMLElement);

  (document.getElementById("whoamiButton") as HTMLButtonElement).onclick =
    async () => {
      try {
        const response = await actor.whoami();
        console.log(response);
        (document.getElementById("whoami") as HTMLInputElement).value =
          response.toString();
      } catch (error) {
        console.error(error);
      }
    };

  (document.getElementById("logout") as HTMLButtonElement).onclick =
    async () => {
      console.log(authClient instanceof iiAuth.AuthClient);
      if (authClient instanceof iiAuth.AuthClient === true) {
        await (authClient as unknown as iiAuth.AuthClient).logout();
      } else {
        await (authClient as IC).disconnect();
      }

      await init();
    };
};
