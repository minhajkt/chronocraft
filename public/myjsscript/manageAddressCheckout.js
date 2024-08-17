
document.addEventListener('DOMContentLoaded', function () {

    const form = document.getElementById('addAddressForm');


    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const streetInput = document.getElementById('street');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        const pincodeInput = document.getElementById('pincode');

        if (!streetInput.value.trim()) {
            displayError(streetInput, 'Street is required');
            return;
        } else {
            removeError(streetInput);
        }


        if (!cityInput.value.trim()) {
            displayError(cityInput, 'City is required');
            return;
        } else {
            removeError(cityInput);
        }


        if (!stateInput.value.trim()) {
            displayError(stateInput, 'State is required');
            return;
        } else {
            removeError(stateInput);
        }


        if (!pincodeInput.value.trim()) {
            displayError(pincodeInput, 'Pin Code is required');
            return;
        
        } else {
            removeError(pincodeInput);
        }

        if (!/^\d+$/.test(pincodeInput.value.trim())) {
            displayError(pincodeInput, 'Pin Code should be numbers only');
            return;
        } else {
            removeError(pincodeInput);
        }

        form.submit();
    });


    function displayError(input, message) {
        const feedback = input.nextElementSibling; 
        feedback.innerText = message;
        input.classList.add('is-invalid');
    }


    function removeError(input) {
        const feedback = input.nextElementSibling; 
        feedback.innerText = '';
        input.classList.remove('is-invalid');
    }
});



$(document).ready(function() {

    $('.edit-btn').click(function(event) {
        event.preventDefault();

        var addressId = $(this).data('id');
        var street = $(this).data('street');
        var city = $(this).data('city');
        var state = $(this).data('state');
        var pincode = $(this).data('pincode');

        $('#editStreet').val(street);
        $('#editCity').val(city);
        $('#editState').val(state);
        $('#editPincode').val(pincode);
        $('#editAddressId').val(addressId);

        $('#editAddressModal').modal('show');
    });

    function displayError(input, message) {
        $(input).addClass('is-invalid');
        $(input).next('.invalid-feedback').text(message).show();
    }


    function removeError(input) {
        $(input).removeClass('is-invalid');
        $(input).next('.invalid-feedback').hide();
    }


    $('#editAddressForm').submit(function(event) {
        event.preventDefault();


        var addressId = $('#editAddressId').val();
        var updatedData = {
            street: $('#editStreet').val(),
            city: $('#editCity').val(),
            state: $('#editState').val(),
            pincode: $('#editPincode').val()
        };

        const streetInput = document.getElementById('editStreet');
        const cityInput = document.getElementById('editCity');
        const stateInput = document.getElementById('editState');
        const pincodeInput = document.getElementById('editPincode');


        if (!streetInput.value.trim()) {
            displayError(streetInput, 'Street is required');
            return;
        } else {
            removeError(streetInput);
        }

        if (!cityInput.value.trim()) {
            displayError(cityInput, 'City is required');
            return;
        } else {
            removeError(cityInput);
        }

        if (!stateInput.value.trim()) {
            displayError(stateInput, 'State is required');
            return;
        } else {
            removeError(stateInput);
        }

        if (!pincodeInput.value.trim()) {
            displayError(pincodeInput, 'Pin Code is required');
            return;
        } else {
            removeError(pincodeInput);
        }

        if (!/^\d+$/.test(pincodeInput.value.trim())) {
            displayError(pincodeInput, 'Pin Code should be numbers only');
            return;
        } else {
            removeError(pincodeInput);
        }

        $.ajax({
            url: '/edit-address/' + addressId,
            method: 'PATCH', 
            data: updatedData,
            success: function(response) {
                if (response.success) {
                    location.reload();  
                    console.log('Address updated successfully');
                } else {
                    alert('Failed to update the address.');
                }
            },
            error: function(xhr, status, error) {
                alert('An error occurred: ' + error);
            }
        });
    });
});





$(document).ready(function() {

    $('.delete-btn').click(function() {
        var addressId = $(this).data('id');

        $('#confirmationModal').data('address-id', addressId);


        $('#confirmationModal').modal('show');
    });

    $('#confirmDeleteBtn').click(function() {
        var addressId = $('#confirmationModal').data('address-id');

        $.ajax({
            url: '/delete-address',
            method: 'POST',
            data: { id: addressId },
            success: function(response) {
                if (response.success) {

                    $('.delete-btn[data-id="' + addressId + '"]').closest('.address-card').remove();
                    console.log('Address deletion success', addressId);


                    $('#confirmationModal').modal('hide');


                    showNotification('Address deleted successfully', 'success');
                } else {
                    alert('Failed to delete the address.');
                }
            },
            error: function(xhr, status, error) {
                alert('An error occurred: ' + error);
            }
        });
    });
});