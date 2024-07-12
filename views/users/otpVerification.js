function updateTimer(otpExpires) {
    const now = new Date().getTime();
    const timeRemaining = otpExpires - now;

    if (timeRemaining > 0) {
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        document.getElementById('otp-timer').innerText = `${minutes}m ${seconds}s`;
        setTimeout(() => updateTimer(otpExpires), 1000);
    } else {
        document.getElementById('otp-timer').innerText = 'Expired';
    }
}