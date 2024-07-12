$(document).ready(function() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        function validateInput(input) {
            const inputId = input.attr('id');
            const value = input.val().trim();
            let isValid = true;
            let errorMessage = '';

            switch (inputId) {
                case 'username':
                    if (!value) {
                        isValid = false;
                        errorMessage = 'Name is required.';
                    }
                    break;
                case 'email':
                    if (!value) {
                        isValid = false;
                        errorMessage = 'Email is required.';
                    } else if (!emailRegex.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid email address.';
                    }
                    break;
                case 'password':
                    if (!value) {
                        isValid = false;
                        errorMessage = 'Password is required.';
                    } else if (value.length < 6) {
                        isValid = false;
                        errorMessage = 'Password should be at least 6 characters.';
                    }
                    break;
                case 'confirm_password':
                    const password = $('#password').val().trim();
                    if (!value) {
                        isValid = false;
                        errorMessage = 'Please confirm your password.';
                    } else if (value !== password) {
                        isValid = false;
                        errorMessage = 'Passwords do not match.';
                    }
                    break;
            }

            if (isValid) {
                input.closest('.input-control').removeClass('error').addClass('success');
                input.siblings('.error').text('');
            } else {
                input.closest('.input-control').removeClass('success').addClass('error');
                input.siblings('.error').text(errorMessage);
            }

            return isValid;
        }

        $('#username, #email, #password, #confirm_password').on('blur input', function() {
            validateInput($(this));
        });

        $('#registrationForm').submit(function(event) {
            event.preventDefault();


            $('.input-control').removeClass('error success');
            $('.error').text('');
            $('#error-message').text('');

            let isValid = true;
            $('#username, #email, #password, #confirm_password').each(function() {
                if (!validateInput($(this))) {
                    isValid = false;
                }
            });

            if (isValid) {
                this.submit();
            } else {
                $('#error-message').text('Please enter the required details');
            }
        });
    });