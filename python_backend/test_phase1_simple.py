"""
Simple test for Phase 1 - No auth required
Tests basic endpoints and service imports
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

print("=" * 60)
print("🚀 Phase 1 Simple Tests (No Auth Required)")
print("=" * 60)

# Test 1: Import OAuth service
print("\n🔍 Test 1: OAuth Service Import...")
try:
    from src.services.oauth_service import generate_random_state, generate_pkce, verify_pkce
    print("✅ OAuth service imported successfully")
except Exception as e:
    print(f"❌ Failed to import OAuth service: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 2: Generate random state
print("\n🔍 Test 2: Generate Random State...")
try:
    state = generate_random_state()
    print(f"Generated state: {state[:30]}... (length: {len(state)})")
    assert len(state) > 20
    print("✅ Random state generation works")
except Exception as e:
    print(f"❌ Failed: {e}")
    sys.exit(1)

# Test 3: Generate PKCE
print("\n🔍 Test 3: Generate PKCE...")
try:
    pkce = generate_pkce()
    print(f"Code verifier: {pkce['code_verifier'][:30]}...")
    print(f"Code challenge: {pkce['code_challenge'][:30]}...")
    print(f"Method: {pkce['code_challenge_method']}")
    assert pkce['code_challenge_method'] == 'S256'
    assert len(pkce['code_verifier']) >= 43
    print("✅ PKCE generation works")
except Exception as e:
    print(f"❌ Failed: {e}")
    sys.exit(1)

# Test 4: Verify PKCE
print("\n🔍 Test 4: Verify PKCE...")
try:
    is_valid = verify_pkce(pkce['code_verifier'], pkce['code_challenge'])
    print(f"Valid PKCE: {is_valid}")
    assert is_valid
    
    is_invalid = verify_pkce("wrong_verifier", pkce['code_challenge'])
    print(f"Invalid PKCE detected: {not is_invalid}")
    assert not is_invalid
    print("✅ PKCE verification works")
except Exception as e:
    print(f"❌ Failed: {e}")
    sys.exit(1)

# Test 5: Import Storage service
print("\n🔍 Test 5: Storage Service Import...")
try:
    from src.services.storage_service import storage_service
    print("✅ Storage service imported successfully")
except Exception as e:
    print(f"❌ Failed to import Storage service: {e}")
    sys.exit(1)

# Test 6: Import Social service
print("\n🔍 Test 6: Social Service Import...")
try:
    from src.services.social_service import social_service
    print("✅ Social service imported successfully")
except Exception as e:
    print(f"❌ Failed to import Social service: {e}")
    sys.exit(1)

# Test 7: Test app secret proof generation
print("\n🔍 Test 7: Facebook App Secret Proof...")
try:
    proof = social_service.generate_app_secret_proof("test_token", "test_secret")
    print(f"Generated proof: {proof[:30]}...")
    assert len(proof) == 64  # SHA256 hex is 64 characters
    print("✅ App secret proof generation works")
except Exception as e:
    print(f"❌ Failed: {e}")
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ All Phase 1 Simple Tests Passed!")
print("=" * 60)
print("\n📋 Summary:")
print("  ✅ OAuth service with PKCE - Working")
print("  ✅ Storage service - Imported")
print("  ✅ Social service - Imported")
print("  ✅ Facebook app secret proof - Working")
print("\n🎯 Phase 1: Core Infrastructure Services - VERIFIED")
print("\nℹ️  Note: Full API endpoint tests require running server")
print("   Run: uv run uvicorn src.main:app --reload --port 8000")
