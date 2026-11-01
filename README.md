# Pixel Resolution Lab

An interactive English-language learning app for exploring image resolution and practising with short challenges. No dependencies or account are required.

## Run locally

Requires Node.js 18 or later.

```sh
npm start
```

Open <http://127.0.0.1:3000>. Stop the server with Ctrl+C. To choose a different port, set the `PORT` environment variable before starting.

Run the automated checks with `npm test`.

## Learning activities

Use **Explore** to compare an original illustration to pixelated versions, inspect the pixel count and estimate uncompressed image data. The initial illustration starts at its full 320 × 240 resolution, with the slider at the maximum. Choose a local photo or drag and drop it onto **Drag and drop the image here**. JPEG, PNG and WebP files up to 100 MB are supported. A working image is reduced to at most 1600 pixels along its longest side, preserving its proportions; smaller images are not enlarged. The original file stays unchanged, and photos are processed only in your browser, never uploaded to a server. An invalid or unreadable file shows an error without replacing your selected picture. After a successful load, **Your photo** is selected and the slider starts at the far right, showing the full working-image resolution in both views. Move it left to try lower resolutions (8, 16, 32, 64 and 128 pixels wide when smaller than the working image). Slider labels reflect the available widths; very narrow photos offer only widths below their actual width, never enlarged settings. Choose any illustration directly to return to the samples and their original slider range; your last sample setting stays selected unless you deliberately choose a shared lower resolution while viewing a photo. Switch to **Challenge** for image recognition, detail, pixel maths and choosing an appropriate resolution. Switching modes keeps the current state while the page remains open.

In **TV Lab**, compare the same picture on proportional 32″, 45″ and 70″ virtual screens. Upload a JPEG, PNG or WebP photo (up to 100 MB) using the picker or drag-and-drop; it stays in your browser. The TV Lab working copy is limited to 3840 pixels on its longest side without enlarging smaller images. Choose **Original** or **Simulate HD** to compare the available detail against a version fitted within 1280 × 720 pixels. **Look closer** shows the same physical area on each virtual screen: larger screens spread the source pixels over more space. The displays are simulations; physical dimensions, viewing distance, panel resolution, scaling and source quality affect real results.

The source illustrations and working photos contain the detail shown by the higher-resolution previews. Enlarging a low-resolution image alone cannot restore detail that was lost. Storage estimates use uncompressed pixel data and do not include file headers or compression.

## Design reference

The approved [wireframes](docs/pixel-resolution-wireframes.png) are the visual reference. The working task record is kept locally and is not included in the public repository.
