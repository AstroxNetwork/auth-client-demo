import { html, render } from 'lit-html';
const content = html`<div class="container">
	<h1>Identity Client</h1>
	<h2>You are not authenticated</h2>
	<p>Choose Identity Provider</p>
	<button type="button" id="loginButton" class="primary">ME</button>
	<button type="button" id="loginButton2">Internet Identity</button>
</div>`;

export const renderIndex = async () => {
	render(content, document.getElementById('pageContent') as HTMLElement);
};
