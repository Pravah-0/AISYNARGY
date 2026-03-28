import auth
try:
    password = "testpassword123"
    hashed = auth.get_password_hash(password)
    print(f"Hashed: {hashed}")
    verified = auth.verify_password(password, hashed)
    print(f"Verified: {verified}")
    if verified:
        print("SUCCESS")
    else:
        print("FAILURE")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
