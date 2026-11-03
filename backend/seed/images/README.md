# Seed images

Sample images for the development seed. `backend/app/seed.py` copies every file
in this folder into the uploads folder (`backend/uploads/`, served at
`/uploads/<file>`) before it writes the catalog rows, so the seeded products,
categories and brands have images that resolve.

The seed also generates a placeholder SVG for any seeded image that is still
missing after the copy, so a fresh checkout always serves real images even when
this folder is empty.
