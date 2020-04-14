
import process from 'process';

import { console                 } from '../../stealth/source/BASE.mjs';
import { Covert                  } from '../source/Covert.mjs';
import { action, flags, patterns } from '../source/ENVIRONMENT.mjs';
import { REVIEWS as BASE         } from '../../base/review/index.mjs';
import { REVIEWS as COVERT       } from '../../covert/review/index.mjs';
import { REVIEWS as STEALTH      } from '../../stealth/review/index.mjs';



const REVIEWS = [
	...BASE,
	...COVERT,
	...STEALTH
];

const reset = (review) => {

	review.state = null;

	if (review.before !== null) {
		review.before.state = null;
		review.before.results.reset();
		review.before.timeline.reset();
	}

	if (review.tests.length > 0) {
		review.tests.forEach((test) => {
			test.state = null;
			test.results.reset();
			test.timeline.reset();
		});
	}

	if (review.after !== null) {
		review.after.state = null;
		review.after.results.reset();
		review.after.timeline.reset();
	}

};

const show_help = () => {

	console.log('');
	console.info('Covert');
	console.log('');
	console.log('Usage: covert [Action] [Identifier...] [--Flag=Value...]');
	console.log('');
	console.log('Usage Notes:');
	console.log('');
	console.log('    Identifier can also have a wildcard prefix or suffix.        ');
	console.log('    If no Identifier is given, all available Reviews are matched.');
	console.log('');
	console.log('Available Actions:');
	console.log('');
	console.log('    Action     | Description                                              ');
	console.log('    -----------|----------------------------------------------------------');
	console.log('    scan       | Scans reviews and executes their tests.                  ');
	console.log('    time       | Scans reviews and benchmarks their test timelines.       ');
	console.log('    watch      | Observes Filesystem changes and scans Reviews on changes.');
	console.log('');
	console.log('Available Flags:');
	console.log('');
	console.log('    Flag       | Default | Values      | Description                                         ');
	console.log('    -----------|---------|-------------|-----------------------------------------------------');
	console.log('    --debug    | true    | true, false | Enable/Disable debug messages. Defaulted with false.');
	console.log('    --internet | false   | true, false | Enable/Disable internet usage. Defaulted with true. ');
	console.log('    --network  | null    | 2G, 3G, 4G  | Simulate network behaviour. Defaulted with null.    ');
	console.log('');
	console.log('Examples:');
	console.log('');
	console.log('    covert scan stealth/protocol/*;');
	console.log('    covert time stealth/protocol/DNS --network=2G;');
	console.log('    covert watch stealth/protocol/DNS protocol/HTTPS;');
	console.log('');

};

const on_complete = (covert) => {

	let fails = covert.reviews.filter((r) => r.state === 'fail');
	let skips = covert.reviews.filter((r) => r.state === null);
	let waits = covert.reviews.filter((r) => r.state === 'wait');

	if (skips.length > 0 || waits.length > 0) {

		if (covert._settings.debug === true) {
			console.log('');
		} else {
			console.clear();
		}

		console.warn('');
		console.warn('Covert: Some reviews didn\'t complete.');
		console.warn('');

		skips.forEach((review, r) => {

			if (r > 0) console.log('');

			covert.renderer.render(review, 'complete');

		});

		if (waits.length > 0) {
			console.log('');
		}

		waits.forEach((review, r) => {

			if (r > 0) console.log('');

			covert.renderer.render(review, 'summary');

		});


		if (fails.length > 0) {
			console.log('');
		}

		fails.forEach((review, r) => {

			if (r > 0) console.log('');

			covert.renderer.render(review, 'summary');

		});


		process.exit(2);

	} else if (fails.length > 0) {

		if (covert._settings.debug === true) {
			console.log('');
		} else {
			console.clear();
		}

		console.error('');
		console.error('Covert: Some reviews didn\'t succeed.');
		console.error('');

		fails.forEach((review) => {
			covert.renderer.render(review, 'summary');
		});

		process.exit(1);

	} else {

		if (covert._settings.debug === true) {
			console.log('');
		} else {
			console.clear();
		}


		console.info('');
		console.info('Covert: All reviews did succeed.');
		console.info('');

		let action = covert._settings.action || null;
		if (action === 'time' || action === 'watch') {

			console.log('');

			covert.reviews.forEach((review, r) => {

				if (r > 0) console.log('');

				covert.renderer.render(review, 'complete');

			});

		}

		process.exit(0);

	}

};



if (action === 'watch') {

	console.log('');
	console.info('Covert: Watch Mode');
	console.log('');


	let covert = new Covert({
		action:   action         || null,
		debug:    flags.debug    || false,
		internet: flags.internet || null,
		network:  flags.network  || null,
		patterns: patterns       || [],
		reviews:  REVIEWS
	});

	process.on('SIGINT', () => {

		setTimeout(() => {
			on_complete(covert);
		}, 1000);

	});

	process.on('SIGQUIT', () => {

		setTimeout(() => {
			on_complete(covert);
		}, 1000);

	});

	process.on('SIGABRT', () => {

		setTimeout(() => {
			on_complete(covert);
		}, 1000);

	});

	process.on('SIGTERM', () => {

		setTimeout(() => {
			on_complete(covert);
		}, 1000);

	});

	covert.on('disconnect', () => {

		let stub = setInterval(() => {
			// Do nothing
		}, 500);

		covert.once('connect', () => {

			if (stub !== null) {
				clearInterval(stub);
				stub = null;
			}

		});

	});

	covert.on('change', (reviews, review) => {

		covert.once('disconnect', () => {
			reset(review);
			covert.connect();
		});

		covert.disconnect();

	});

	if (patterns.length > 0 && covert.reviews.length === 0) {

		console.warn('Covert: No Review(s) matching the patterns "' + patterns.join('" or "') + '" found.');
		process.exit(2);

	} else {
		covert.connect();
	}

} else if (action === 'scan' || action === 'time') {

	console.log('');
	console.info('Covert: ' + action[0].toUpperCase() + action.substr(1) + ' Mode');
	console.log('');


	let covert = new Covert({
		action:   action         || null,
		debug:    flags.debug    || false,
		internet: flags.internet || null,
		network:  flags.network  || null,
		patterns: patterns       || [],
		reviews:  REVIEWS
	});

	covert.on('disconnect', () => {
		on_complete(covert);
	});

	if (patterns.length > 0 && covert.reviews.length === 0) {

		console.warn('Covert: No Review(s) matching the patterns "' + patterns.join('" or "') + '" found.');
		process.exit(2);

	} else {
		covert.connect();
	}

} else {

	show_help();
	process.exit(1);

}
