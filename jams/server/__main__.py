from server import create_app

if __name__ == '__main__':
    app = create_app()
    app.run(host='127.0.0.1', port=5001, debug=False) # No auto reload as it causes 2 instances of WSS to start