let mollyImage = "https://alankwak.dev/molly.jpg";

const imgs = document.getElementsByTagName("img");

for(img of imgs) {
    img.src = mollyImage;
    console.log("successfully replaced image");
}