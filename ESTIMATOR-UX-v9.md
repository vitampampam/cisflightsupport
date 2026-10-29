# Airport browser usability (v9)

- Removed native country/city/airport select menus inside the airport browser.
- Replaced with three website-styled typeahead comboboxes.
- Country: type a name such as Germany; select a match. All airports in the selected country are then available, without requiring a city selection.
- City: one editable field supports both typing and selection. Its suggestions narrow as the user types, including partial strings such as `fra`. City is optional.
- Airport: type or select from airports in the chosen country, narrowed further by an optional city. ICAO and IATA searches remain available in the main route fields.
- Keyboard: Up/Down navigate suggestions, Enter chooses one, Escape closes the list. Dropdowns are height-limited, styled, and shown inline below their inputs.
- No change to estimator math or aircraft reference data.
