document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form");
    const imagesInput = document.getElementById("images");
    const previewContainer = document.querySelector(".preview-images");
    const imageList = document.querySelector(".image-list");

    imagesInput.addEventListener("change", function() {
      
        previewContainer.innerHTML = "";

        const files = this.files;
        if (files) {
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const imageUrl = event.target.result;

                 
                    const listItem = document.createElement("li");
                    listItem.classList.add("image-item");
                    listItem.style.display = "inline-block";
                    listItem.style.position = "relative";
                    listItem.style.marginRight = "15px";

                    const imageContainer = document.createElement("div");
                    imageContainer.classList.add("image-container");
                    imageContainer.style.position = "relative";

                    const image = document.createElement("img");
                    image.src = imageUrl;
                    image.alt = "Product Image";
                    image.style.maxWidth = "90px";
                    image.style.marginBottom = "20px";

                    const deleteButton = document.createElement("a");
                    deleteButton.href = "#";
                    deleteButton.classList.add("btn-delete");
                    deleteButton.style.position = "absolute";
                    deleteButton.style.top = "0px";
                    deleteButton.style.right = "0px";
                    deleteButton.style.color = "white";
                    deleteButton.style.border = "none";
                    deleteButton.style.borderRadius = "50%";
                    deleteButton.style.padding = "0px";
                    deleteButton.style.cursor = "pointer";
                    deleteButton.innerHTML = '<i class="material-icons">&#xe872;</i>';

                    
                    deleteButton.addEventListener("click", function(e) {
                        e.preventDefault();
                        listItem.remove();
                    });

                    imageContainer.appendChild(image);
                    imageContainer.appendChild(deleteButton);
                    listItem.appendChild(imageContainer);
                    previewContainer.appendChild(listItem);
                };
                reader.readAsDataURL(file);
            });
        }
    });

    form.addEventListener("submit", (e) => {
        if (!validateInputs()) {
            e.preventDefault();
        }
    });

    const setError = (element, message) => {
        const inputControl = element.parentElement;
        const errorDisplay = inputControl.querySelector(".error-message");
        if (errorDisplay) {
            errorDisplay.innerText = message;
        } else {
            console.error("No error message container found for element", element);
        }
        inputControl.classList.add("error");
        inputControl.classList.remove("success");
    };

    const setSuccess = (element) => {
        const inputControl = element.parentElement;
        const errorDisplay = inputControl.querySelector(".error-message");
        if (errorDisplay) {
            errorDisplay.innerText = "";
        } else {
            console.error("No error message container found for element", element);
        }
        inputControl.classList.add("success");
        inputControl.classList.remove("error");
    };

    const validateInputs = () => {
        const name = document.getElementById("name");
        const description = document.getElementById("description");
        const price = document.getElementById("price");
        const quantity = document.getElementById("quantity");

        const nameValue = name.value.trim();
        const descriptionValue = description.value.trim();
        const priceValue = price.value.trim();
        const quantityValue = quantity.value.trim();
        const existingImagesCount = imageList.querySelectorAll(".image-item").length;
        const newImagesCount = imagesInput.files.length;

        let isValid = true;

        if (nameValue === "") {
            setError(name, "Name is required");
            isValid = false;
        } else {
            setSuccess(name);
        }

        if (descriptionValue === "") {
            setError(description, "Description is required");
            isValid = false;
        } else {
            setSuccess(description);
        }

        if (priceValue === "") {
            setError(price, "Price is required");
            isValid = false;
        } else {
            setSuccess(price);
        }

        if (quantityValue === "") {
            setError(quantity, "Quantity is required");
            isValid = false;
        } else {
            setSuccess(quantity);
        }

        if (existingImagesCount + newImagesCount < 3) {
            setError(imagesInput, "At least 3 images are required");
            isValid = false;
        } else {
            setSuccess(imagesInput);
        }

        return isValid;
    };
});

    document.addEventListener("DOMContentLoaded", () => {
    const imagesContainer = document.querySelector(".image-list");
    const imagesInput = document.getElementById("images");
    let imagesCount = document.querySelectorAll(".image-item").length;

    const updateImageCount = () => {
        imagesCount = document.querySelectorAll(".image-item").length;
        if (imagesCount < 3) {
            history.pushState(null, null, location.href); 
            window.onpopstate = function () {
                history.go(1);
            };
        }
    };

    
    imagesInput.addEventListener("change", () => {
        updateImageCount();
    });

  
    imagesContainer.addEventListener("click", async (e) => {
        if (e.target.classList.contains("btn-delete")) {
            e.preventDefault();
            const imageElement = e.target.closest(".image-item");
        
            const productId = imageElement.dataset.productId; 
            const imageSrc = imageElement.querySelector("img").src; 

            try {
              
                await fetch(`/admin/products/delete-image?productId=${productId}&image=${encodeURIComponent(imageSrc)}`, {
                    method: 'DELETE',
               
                });

               
                imageElement.remove()
                updateImageCount(); 
            } catch (error) {
                console.error('Error deleting image:', error);
            
            }
        }
    });
});




// document.addEventListener("DOMContentLoaded", () => {
//     const form = document.getElementById("form");

//     const name = document.getElementById("name");
//     const description = document.getElementById("description");
//     const price = document.getElementById("price");
//     const quantity = document.getElementById("quantity");

//     const errorMessage = document.getElementById("error-message");

//     form.addEventListener("submit", (e) => {
//         if (!validateInputs()) {
//             e.preventDefault();
//         }
//     });

//     const setError = (element, message) => {
//         const inputControl = element.parentElement;
//         const errorDisplay = inputControl.querySelector(".error-message");
//         if (errorDisplay) {
//             errorDisplay.innerText = message;
//         } else {
//             console.error("No error message container found for element", element);
//         }
//         inputControl.classList.add("error");
//         inputControl.classList.remove("success");
//     };

//     const setSuccess = (element) => {
//         const inputControl = element.parentElement;
//         const errorDisplay = inputControl.querySelector(".error-message");
//         if (errorDisplay) {
//             errorDisplay.innerText = "";
//         } else {
//             console.error("No error message container found for element", element);
//         }
//         inputControl.classList.add("success");
//         inputControl.classList.remove("error");
//     };

//     const validateInputs = () => {
//         const nameValue = name.value.trim();
//         const descriptionValue = description.value.trim();
//         const priceValue = price.value.trim();
//         const quantityValue = quantity.value.trim();

//         let isValid = true;

//         if (nameValue === "") {
//             setError(name, "Name is required");
//             isValid = false;
//         } else {
//             setSuccess(name);
//         }

//         if (descriptionValue === "") {
//             setError(description, "Description is required");
//             isValid = false;
//         } else {
//             setSuccess(description);
//         }

//         if (priceValue === "") {
//             setError(price, "Price is required");
//             isValid = false;
//         } else {
//             setSuccess(price);
//         }

//         if (quantityValue === "") {
//             setError(quantity, "Quantity is required");
//             isValid = false;
//         } else {
//             setSuccess(quantity);
//         }

//         return isValid;
//     };
// });
