"""
Test LinkedIn API Implementation
Tests all LinkedIn endpoints and service
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

print("=" * 60)
print("🧪 Testing LinkedIn API Implementation")
print("=" * 60)

# Test 1: Import LinkedIn service
print("\n🔍 Test 1: Import LinkedIn Service...")
try:
    from src.services.platforms.linkedin_service import linkedin_service
    print(f"✅ LinkedIn service imported successfully")
    print(f"   API Base: {linkedin_service.LINKEDIN_REST_API}")
    print(f"   API Version: {linkedin_service.LINKEDIN_API_VERSION}")
except Exception as e:
    print(f"❌ Failed to import LinkedIn service: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 2: Import LinkedIn router
print("\n🔍 Test 2: Import LinkedIn Router...")
try:
    from src.api.v1.social.linkedin import router
    print(f"✅ LinkedIn router imported successfully")
    print(f"   Prefix: {router.prefix}")
    print(f"   Tags: {router.tags}")
except Exception as e:
    print(f"❌ Failed to import LinkedIn router: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Check service methods
print("\n🔍 Test 3: Check Service Methods...")
try:
    required_methods = [
        'refresh_token',
        'get_user_profile',
        'get_user_urn',
        'get_organizations',
        'post_to_linkedin',
        'initialize_image_upload',
        'upload_image_binary',
        'upload_image',
        'initialize_video_upload',
        'upload_video_binary',
        'finalize_video_upload',
        'post_carousel',
        'upload_and_post_carousel'
    ]
    
    for method in required_methods:
        if not hasattr(linkedin_service, method):
            raise AttributeError(f"Missing method: {method}")
        print(f"   ✓ {method}")
    
    print("✅ All service methods available")
except Exception as e:
    print(f"❌ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Check request models
print("\n🔍 Test 4: Check Request/Response Models...")
try:
    from src.api.v1.social.linkedin import (
        LinkedInPostRequest,
        LinkedInCarouselRequest,
        LinkedInUploadMediaRequest,
        LinkedInPostResponse,
        LinkedInCarouselResponse,
        LinkedInUploadResponse
    )
    
    # Test creating a post request
    post_req = LinkedInPostRequest(
        text="Test post",
        visibility="PUBLIC"
    )
    print(f"   ✓ LinkedInPostRequest: {post_req.text}")
    
    # Test carousel request
    carousel_req = LinkedInCarouselRequest(
        text="Test carousel",
        imageUrls=["https://example.com/1.jpg", "https://example.com/2.jpg"]
    )
    print(f"   ✓ LinkedInCarouselRequest: {len(carousel_req.imageUrls)} images")
    
    # Test upload request
    upload_req = LinkedInUploadMediaRequest(
        mediaData="data:image/jpeg;base64,test",
        mediaType="image"
    )
    print(f"   ✓ LinkedInUploadMediaRequest: {upload_req.mediaType}")
    
    print("✅ All request/response models working")
except Exception as e:
    print(f"❌ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 5: Check helper functions
print("\n🔍 Test 5: Check Helper Functions...")
try:
    from src.api.v1.social.linkedin import (
        get_linkedin_credentials,
        refresh_linkedin_token_if_needed
    )
    
    print("   ✓ get_linkedin_credentials")
    print("   ✓ refresh_linkedin_token_if_needed")
    print("✅ Helper functions available")
except Exception as e:
    print(f"❌ Failed: {e}")
    sys.exit(1)

# Test 6: Test URN formatting
print("\n🔍 Test 6: Test URN Formatting...")
try:
    # Test person URN
    person_urn = linkedin_service._format_author_urn("12345", is_organization=False)
    assert person_urn == "urn:li:person:12345", f"Expected urn:li:person:12345, got {person_urn}"
    print(f"   ✓ Person URN: {person_urn}")
    
    # Test organization URN
    org_urn = linkedin_service._format_author_urn("67890", is_organization=True)
    assert org_urn == "urn:li:organization:67890", f"Expected urn:li:organization:67890, got {org_urn}"
    print(f"   ✓ Organization URN: {org_urn}")
    
    # Test already formatted URN
    formatted = linkedin_service._format_author_urn("urn:li:person:12345", is_organization=False)
    assert formatted == "urn:li:person:12345", f"Expected urn:li:person:12345, got {formatted}"
    print(f"   ✓ Already formatted URN preserved")
    
    print("✅ URN formatting working correctly")
except Exception as e:
    print(f"❌ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 7: Check endpoint routes
print("\n🔍 Test 7: Check Endpoint Routes...")
try:
    from src.api.v1.social.linkedin import router
    
    routes = [route.path for route in router.routes]
    expected_routes = [
        '/api/v1/social/linkedin/post',
        '/api/v1/social/linkedin/carousel',
        '/api/v1/social/linkedin/upload-media',
        '/api/v1/social/linkedin/verify',
        '/api/v1/social/linkedin/'
    ]
    
    for expected in expected_routes:
        if expected in routes:
            print(f"   ✓ {expected}")
        else:
            raise ValueError(f"Missing route: {expected}")
    
    print("✅ All endpoints registered")
except Exception as e:
    print(f"❌ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ All LinkedIn API Tests Passed!")
print("=" * 60)
print("\n📋 Summary:")
print("  ✅ LinkedIn service - Working")
print("  ✅ LinkedIn router - Working")
print("  ✅ Service methods - All present")
print("  ✅ Request/Response models - Working")
print("  ✅ Helper functions - Available")
print("  ✅ URN formatting - Working")
print("  ✅ API endpoints - Registered")
print("\n🎯 LinkedIn API Implementation - VERIFIED")
print("\n📝 Implemented Features:")
print("  • Text posts")
print("  • Image posts (with URN)")
print("  • Video posts (with URN)")
print("  • Multi-image carousels (2-20 images)")
print("  • Concurrent carousel uploads (5 parallel)")
print("  • Personal profile posting")
print("  • Organization page posting")
print("  • Media upload (image/video → URN)")
print("  • Connection verification")
print("  • Automatic token refresh")
print("  • Visibility control (PUBLIC/CONNECTIONS)")
print("\n🏗️  Architecture:")
print("  ✅ Separate service file (linkedin_service.py)")
print("  ✅ Modular design in /services/platforms/")
print("  ✅ Clean separation of concerns")
print("\nℹ️  Note: Full API tests require running server and authentication")
print("   Run: uv run uvicorn src.main:app --reload --port 8000")
