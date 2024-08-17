    document.addEventListener('DOMContentLoaded', function() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-product-id');
            
            fetch('/add-to-cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: productId,
                    quantity: 1
                }),
            })
            .then(response => {
                if(response.status === 401){
                    window.location.href = '/login'
                    return Promise.reject('User Not Logged In');
                }
                return response.json()
            })
            .then(data => {
                if (data.success) {
                    showNotification('Product added to cart!');
                    
                } else {
                    alert('Failed to add product to cart.' + (data.message || 'Unknown error'));
                }
            })
            .catch(error => {
                if (error !== 'User Not Logged In') {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
                }
            });
        });
    });
});

     function showNotification(message, type) {
            var notificationContainer = $('#notification-container');
            var notification = $('<div class="alert alert-' + type + ' alert-dismissible" role="alert">' + 
                                 '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' + 
                                 '<span aria-hidden="true"></span></button>' + message + '</div>');
            notificationContainer.append(notification);
            

            setTimeout(function() {
                notification.fadeOut(500, function() {
                    $(this).remove();
                });
            }, 3000);
        }
   
