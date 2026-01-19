// Swipe Gesture Handler for Siagechat
class SwipeHandler {
    constructor(element, callbacks) {
        this.element = element;
        this.callbacks = callbacks;
        this.startX = 0;
        this.startY = 0;
        this.distX = 0;
        this.distY = 0;
        this.threshold = 100; // Minimum distance for swipe
        this.restraint = 100; // Maximum perpendicular distance
        this.allowedTime = 500; // Maximum time for swipe
        this.startTime = 0;

        this.init();
    }

    init() {
        this.element.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        this.element.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.element.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
    }

    enable() {
        console.log('📱 SwipeHandler enabled');
        // Already initialized via constructor, this is for API compatibility
    }

    handleTouchStart(e) {
        const touch = e.changedTouches[0];
        this.startX = touch.pageX;
        this.startY = touch.pageY;
        this.startTime = new Date().getTime();
    }

    handleTouchMove(e) {
        // Prevent default to avoid scrolling while swiping
        if (Math.abs(e.changedTouches[0].pageX - this.startX) > 10) {
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        const touch = e.changedTouches[0];
        this.distX = touch.pageX - this.startX;
        this.distY = touch.pageY - this.startY;
        const elapsedTime = new Date().getTime() - this.startTime;

        // Check if swipe meets criteria
        if (elapsedTime <= this.allowedTime) {
            // Horizontal swipe
            if (Math.abs(this.distX) >= this.threshold && Math.abs(this.distY) <= this.restraint) {
                if (this.distX > 0) {
                    // Swipe right
                    if (this.callbacks.onSwipeRight) {
                        this.callbacks.onSwipeRight();
                    }
                } else {
                    // Swipe left
                    if (this.callbacks.onSwipeLeft) {
                        this.callbacks.onSwipeLeft();
                    }
                }
            }
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SwipeHandler;
}
