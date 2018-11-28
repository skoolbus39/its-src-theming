$(
		console.log($('[data-widget*="flatpickr"]')),
		// initialize FlexNav
		$(".flexnav").flexNav({
			'hoverIntent': false,
			'hoverIntentTimeout': 130,
		}),
		$('[data-widget*="flatpickr"]').flatpickr({
			enableTime: true,
			dateFormat: "Y-m-d h:iK",
		}),

);