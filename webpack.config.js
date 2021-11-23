const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const dfxJson = require('./dfx.json');
require('dotenv').config();
let localCanister;
const LOCAL_II_CANISTER = 'http://localhost:8000/?canisterId=rwlgt-iiaaa-aaaaa-aaaaa-cai#authorize';
const LOCAL_ME_CANISTER = 'http://localhost:8080/anthen/login#authorize'; //'http://localhost:8000/?canisterId=7bb7f-zaaaa-aaaaa-aabdq-cai#authorize';

try {
	localCanister = require('./.dfx/local/canister_ids.json').whoami.local;
	
} catch {}

// List of all aliases for canisters. This creates the module alias for
// the `import ... from "@dfinity/ic/canisters/xyz"` where xyz is the name of a
// canister.
const aliases = Object.entries(dfxJson.canisters).reduce((acc, [name, _value]) => {
	// Get the network name, or `local` by default.
	const networkName = process.env['DFX_NETWORK'] || 'local';
	const outputRoot = path.join(__dirname, '.dfx', networkName, 'canisters', name);

	return {
		...acc,
		['dfx-generated/' + name]: path.join(outputRoot, name + '.js'),
	};
}, {});

/**
 * Generate a webpack configuration for a canister.
 */
function generateWebpackConfigForCanister(name, info) {
	if (typeof info.frontend !== 'object') {
		return;
	}

	const isProduction = process.env.NODE_ENV === 'production';
	const devtool = isProduction ? undefined : 'source-map';

	return {
		mode: isProduction ? 'production' : 'development',
		entry: {
			// The frontend.entrypoint points to the HTML file for this build, so we need
			// to replace the extension to `.js`.
			index: path.join(__dirname, info.frontend.entrypoint).replace(/\.html$/, '.ts'),
		},
		devtool,
		optimization: {
			minimize: isProduction,
		},
		resolve: {
			alias: aliases,
			extensions: ['.js', '.ts', '.jsx', '.tsx'],
			fallback: {
				assert: require.resolve('assert/'),
				buffer: require.resolve('buffer/'),
				events: require.resolve('events/'),
				stream: require.resolve('stream-browserify/'),
				util: require.resolve('util/'),
			},
		},
		output: {
			filename: '[name].js',
			path: path.join(__dirname, 'dist'),
		},
		devServer: {
			port: 8081,
			proxy: {
				'/api': 'http://localhost:8000',
			},
			allowedHosts: ['.localhost', '.local', '.ngrok.io'],
		},

		// Depending in the language or framework you are using for
		// front-end development, add module loaders to the default
		// webpack configuration. For example, if you are using React
		// modules and CSS as described in the "Adding a stylesheet"
		// tutorial, uncomment the following lines:
		module: {
			rules: [
				{ test: /\.(ts|tsx|jsx)$/, loader: 'ts-loader' },
				{ test: /\.css$/, use: ['style-loader', 'css-loader'] },
			],
		},
		plugins: [
			new HtmlWebpackPlugin({
				template: path.join(__dirname, info.frontend.entrypoint),
				filename: 'index.html',
				chunks: ['index'],
			}),
			new webpack.ProvidePlugin({
				Buffer: [require.resolve('buffer/'), 'Buffer'],
				process: require.resolve('process/browser'),
				path: require.resolve('path'),
			}),
			new webpack.EnvironmentPlugin({
				CANISTER_ID: isProduction?require('./canister_ids.json').whoami.ic:localCanister,
				LOCAL_II_CANISTER,
				LOCAL_ME_CANISTER,
				LEDGER_CANISTER_ID: isProduction
          ? require('./ledger_config.json').PRODUCTION_CANISTERID
          : require('./ledger_config.json').LOCAL_CANISTERID,
				isProduction,
			}),
			new CopyPlugin({
				patterns: [
					{
						from: path.join(__dirname, 'src', 'frontend', 'assets'),
						to: path.join(__dirname, 'dist'),
					},
				],
			}),
		],
	};
}

// If you have additional webpack configurations you want to build
//  as part of this configuration, add them to the section below.
module.exports = [
	...Object.entries(dfxJson.canisters)
		.map(([name, info]) => {
			return generateWebpackConfigForCanister(name, info);
		})
		.filter((x) => !!x),
];
