
    document.addEventListener('DOMContentLoaded', function () {
        const editButton = document.getElementById('editButton');
        const editForm = document.getElementById('editForm');
        const cancelEdit = document.getElementById('cancelEdit');
        const displayInfo = document.getElementById('displayInfo');

        editButton.addEventListener('click', function () {
            editForm.style.display = 'block';
            this.style.display = 'none';
            displayInfo.style.display = 'none';
        });

        cancelEdit.addEventListener('click', function () {
            editForm.style.display = 'none';
            editButton.style.display = 'block'; 
        });
        setTimeout(function() {
            const updateMessage = document.getElementById('updateMessage');
            if (updateMessage) {
                updateMessage.style.display = 'none';
            }
        }, 3000);
    });

    function validateForm() {
        let errorMessage = '';
        const errorMessageDiv = document.getElementById('errorMessage');


        const name = document.getElementById('name').value;
        if (name.trim() === '') {
            errorMessage += 'Name cannot be blank.<br>';
        }


        const email = document.getElementById('email').value;
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            errorMessage += 'Please enter a valid email address.<br>';
        }


        const mobile = document.getElementById('mobile').value;
        const mobilePattern = /^\d{10}$/;
        if (!mobilePattern.test(mobile)) {
            errorMessage += 'Mobile number must be 10 digits.<br>';
        }

        if (errorMessage) {
            errorMessageDiv.innerHTML = errorMessage;
            errorMessageDiv.style.display = 'block';
            return false;
        } else {
            errorMessageDiv.style.display = 'none';
            return true;
        }
    }
