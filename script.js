/*=========================================================
    ACTOR & MODEL PORTFOLIO
=========================================================*/

document.addEventListener("DOMContentLoaded", () => {

    /*=========================
        MOBILE MENU
    =========================*/

    const menuBtn = document.querySelector(".menu-btn");
    const nav = document.querySelector("nav");

    menuBtn.addEventListener("click", () => {

        nav.classList.toggle("show");

        if(nav.classList.contains("show")){
            menuBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        }else{
            menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        }

    });

    document.querySelectorAll("nav a").forEach(link => {

        link.addEventListener("click", () => {

            nav.classList.remove("show");
            menuBtn.innerHTML='<i class="fa-solid fa-bars"></i>';

        });

    });

    /*=========================
        STICKY HEADER
    =========================*/

    const header = document.querySelector("header");

    window.addEventListener("scroll", () => {

        if(window.scrollY > 80){

            header.style.background = "#000";
            header.style.boxShadow =
            "0 10px 30px rgba(0,0,0,.4)";

        }else{

            header.style.background =
            "rgba(0,0,0,.35)";
            header.style.boxShadow = "none";

        }

    });

    /*=========================
        SMOOTH SCROLL
    =========================*/

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {

        anchor.addEventListener("click", function(e){

            e.preventDefault();

            const target =
            document.querySelector(this.getAttribute("href"));

            if(target){

                target.scrollIntoView({

                    behavior:"smooth"

                });

            }

        });

    });

    /*=========================
        ACTIVE MENU
    =========================*/

    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll("nav a");

    window.addEventListener("scroll", () => {

        let current = "";

        sections.forEach(section => {

            const sectionTop = section.offsetTop - 120;

            if(pageYOffset >= sectionTop){

                current = section.getAttribute("id");

            }

        });

        navLinks.forEach(link => {

            link.classList.remove("active");

            if(link.getAttribute("href") === "#" + current){

                link.classList.add("active");

            }

        });

    });

    /*=========================
        SCROLL REVEAL
    =========================*/

    const revealElements = document.querySelectorAll(

        ".service-card,.portfolio-card,.gallery-grid img,.testimonial-card,.about-grid"

    );

    const observer = new IntersectionObserver((entries)=>{

        entries.forEach(entry=>{

            if(entry.isIntersecting){

                entry.target.style.opacity="1";
                entry.target.style.transform="translateY(0)";

            }

        });

    },{

        threshold:.15

    });

    revealElements.forEach(item=>{

        item.style.opacity="0";
        item.style.transform="translateY(60px)";
        item.style.transition=".8s ease";

        observer.observe(item);

    });

    /*=========================
        LIGHTBOX GALLERY
    =========================*/

    const galleryImages =
    document.querySelectorAll(".gallery-grid img");

    if(galleryImages.length){

        const lightbox = document.createElement("div");

        lightbox.className = "lightbox";

        lightbox.innerHTML = `
            <span class="close">&times;</span>
            <img class="lightbox-img">
            <span class="prev">&#10094;</span>
            <span class="next">&#10095;</span>
        `;

        document.body.appendChild(lightbox);

        const lbImg = lightbox.querySelector(".lightbox-img");

        let current = 0;

        function open(index){

            current = index;

            lbImg.src = galleryImages[index].src;

            lightbox.classList.add("show");

        }

        galleryImages.forEach((img,index)=>{

            img.addEventListener("click",()=>{

                open(index);

            });

        });

        lightbox.querySelector(".close")
        .addEventListener("click",()=>{

            lightbox.classList.remove("show");

        });

        lightbox.addEventListener("click",(e)=>{

            if(e.target===lightbox){

                lightbox.classList.remove("show");

            }

        });

        function next(){

            current++;

            if(current>=galleryImages.length){

                current=0;

            }

            lbImg.src=galleryImages[current].src;

        }

        function prev(){

            current--;

            if(current<0){

                current=galleryImages.length-1;

            }

            lbImg.src=galleryImages[current].src;

        }

        lightbox.querySelector(".next")
        .addEventListener("click",next);

        lightbox.querySelector(".prev")
        .addEventListener("click",prev);

        document.addEventListener("keydown",(e)=>{

            if(!lightbox.classList.contains("show")) return;

            if(e.key==="Escape"){

                lightbox.classList.remove("show");

            }

            if(e.key==="ArrowRight"){

                next();

            }

            if(e.key==="ArrowLeft"){

                prev();

            }

        });

    }

    /*=========================
        CONTACT FORM
    =========================*/

    const form = document.querySelector("form");

    form.addEventListener("submit",(e)=>{

        e.preventDefault();

        const name =
        form.querySelector('input[type="text"]');

        const email =
        form.querySelector('input[type="email"]');

        const message =
        form.querySelector("textarea");

        if(

            name.value.trim()==="" ||

            email.value.trim()==="" ||

            message.value.trim()===""

        ){

            alert("Please fill in all required fields.");

            return;

        }

        const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if(!emailPattern.test(email.value)){

            alert("Please enter a valid email.");

            return;

        }

        alert("Thank you! Your message has been sent.");

        form.reset();

    });

    /*=========================
        IMAGE HOVER EFFECT
    =========================*/

    document.querySelectorAll(".portfolio-card img")
    .forEach(img=>{

        img.addEventListener("mouseenter",()=>{

            img.style.filter="brightness(110%)";

        });

        img.addEventListener("mouseleave",()=>{

            img.style.filter="brightness(100%)";

        });

    });

});