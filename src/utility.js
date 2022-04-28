const ordinalRules = new Intl.PluralRules('en', {
	type: 'ordinal'
});

const suffixes = {
	one: 'st',
	two: 'nd',
	few: 'rd',
	other: 'th'
};

function ordinal(number) {
	const category = ordinalRules.select(number);
	const suffix = suffixes[category];
	return (number + suffix);
}

module.exports = {
	ordinal
};