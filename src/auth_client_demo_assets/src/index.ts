import { renderIndex } from './views';
import { Delegation, DelegationChain } from '@dfinity/identity';
import {
	blobFromHex,
	blobFromUint8Array,
	blobToUint8Array,
	derBlobFromBlob,
} from '@dfinity/candid';

const init = async () => {
	renderIndex();
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	const sessionPublicKey = urlParams.get('sessionPublicKey');
	const callbackUri = urlParams.get('callback_uri');

	let idpWindow: Window | null;
	let withHash =
		process.env.DFX_NETWORK === 'ic'
			? 'https://identity.ic0.app/#authorize'
			: process.env.LOCAL_II_CANISTER;

	const loginButton = document.getElementById('loginButton') as HTMLButtonElement;
	loginButton.onclick = async () => {
		idpWindow = window.open(withHash, 'idpWindow');
		if (idpWindow != undefined) {
			let listener = window.addEventListener('message', function (event) {
				let message = event.data;
				switch (message.kind) {
					case 'authorize-ready': {
						// IDP is ready. Send a message to request authorization.
						let request = {
							kind: 'authorize-client',
							sessionPublicKey: blobToUint8Array(blobFromHex(sessionPublicKey!)),
							maxTimeToLive: undefined,
						};

						idpWindow!.postMessage(request, withHash!);
						break;
					}
					case 'authorize-client-success':
						idpWindow!.close();
						const delegations = message.delegations.map((signedDelegation) => {
							return {
								delegation: new Delegation(
									blobFromUint8Array(signedDelegation.delegation.pubkey),
									signedDelegation.delegation.expiration,
									signedDelegation.delegation.targets
								),
								signature: blobFromUint8Array(signedDelegation.signature),
							};
						});

						const delegationChain = DelegationChain.fromDelegations(
							delegations,
							derBlobFromBlob(blobFromUint8Array(message.userPublicKey))
						);
						const json = JSON.stringify(delegationChain.toJSON());

						window.removeEventListener('message', listener as any);
						window.location.href = `${callbackUri}?success=true&&json=` + json;
						break;
					case 'authorize-client-failure':
						idpWindow!.close();
						window.removeEventListener('message', listener as any);
						window.location.href = `${callbackUri}?success=false&&json=` + message.text;
						break;
					default:
						break;
				}
			});
		}
	};

	// empty string
};

init();
