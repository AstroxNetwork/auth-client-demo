import { Actor, HttpAgent } from '@dfinity/agent';
import * as iiAuth from '@dfinity/auth-client';
import { AuthClient } from './auth-client';
import idlFactory from './did';
import type { _SERVICE } from './did';
import { renderIndex } from './views';
import { renderLoggedIn } from './views/loggedIn';

const init = async () => {
	const authClient = await AuthClient.create({ appId: 'appIdxx0012888501' });
	if (await authClient.isAuthenticated()) {
		handleAuthenticated(authClient);
	}

	const iiAuthClient = await iiAuth.AuthClient.create();
	if (await iiAuthClient.isAuthenticated()) {
		handleAuthenticated(iiAuthClient);
	}
	renderIndex();
	const days = BigInt(1);
	const hours = BigInt(24);
	const nanoseconds = BigInt(3600000000000);
	const loginButton = document.getElementById('loginButton') as HTMLButtonElement;
	loginButton.onclick = async () => {
		await authClient.login({
			onSuccess: async () => {
				handleAuthenticated(authClient);
			},
			maxTimeToLive: days * hours * nanoseconds,
		});
	};

	const loginButton2 = document.getElementById('loginButton2') as HTMLButtonElement;
	loginButton2.onclick = async () => {
		await iiAuthClient.login({
			onSuccess: async () => {
				handleAuthenticated(iiAuthClient);
			},
			identityProvider:
				process.env.DFX_NETWORK === 'ic'
					? 'https://identity.ic0.app/#authorize'
					: process.env.LOCAL_II_CANISTER,
			// Maximum authorization expiration is 8 days
			maxTimeToLive: days * hours * nanoseconds,
		});
	};
};

async function handleAuthenticated(authClient: AuthClient | iiAuth.AuthClient) {
	const identity = await authClient.getIdentity();

	const agent = new HttpAgent({ identity });
	console.log(process.env.CANISTER_ID);

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
