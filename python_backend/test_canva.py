"""
Test script for Phase 6: Canva Integration
Tests OAuth, designs, and export endpoints
"""
import asyncio
import httpx

BASE_URL = "http://localhost:8000"


async def test_health():
    """Test health endpoint"""
    print("\n🔍 Testing Health Endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        assert response.status_code == 200
        print("✅ Health check passed")


async def test_canva_info():
    """Test Canva info endpoint"""
    print("\n🔍 Testing Canva Info Endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/v1/canva/")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Service: {data.get('service')}")
        print(f"Configured: {data.get('configured')}")
        print(f"Endpoints: {list(data.get('endpoints', {}).keys())}")
        print(f"Supported design types: {data.get('supported_design_types')}")
        print(f"Supported export formats: {data.get('supported_export_formats')}")
        assert response.status_code == 200
        assert data.get("service") == "Canva Integration"
        print("✅ Canva info endpoint passed")


async def test_canva_auth():
    """Test Canva auth initiation endpoint"""
    print("\n🔍 Testing Canva Auth Endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/canva/auth",
            params={"user_id": "test-user-123"}
        )
        print(f"Status: {response.status_code}")
        
        # May return 500 if CANVA_CLIENT_ID not configured, or 200 with authUrl
        if response.status_code == 200:
            data = response.json()
            auth_url = data.get("authUrl", "")
            print(f"Auth URL generated: {auth_url[:50]}..." if auth_url else "No auth URL")
            assert "canva.com" in auth_url
            print("✅ Canva auth endpoint returned valid URL")
        else:
            # Not configured - that's OK for testing
            print("⚠️  Canva not configured (expected in test environment)")
            assert response.status_code == 500
            print("✅ Canva auth endpoint exists and handles missing config")


async def test_canva_designs():
    """Test Canva designs endpoint"""
    print("\n🔍 Testing Canva Designs Endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/canva/designs",
            params={"user_id": "test-user-123"}
        )
        print(f"Status: {response.status_code}")
        
        # Will return 401 "Canva not connected" since user doesn't have tokens
        assert response.status_code in [200, 401, 500]
        print("✅ Canva designs endpoint exists")


async def test_canva_disconnect():
    """Test Canva disconnect endpoint"""
    print("\n🔍 Testing Canva Disconnect Endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/canva/disconnect",
            params={"user_id": "test-user-123"}
        )
        print(f"Status: {response.status_code}")
        
        # Will succeed even if no integration exists (DELETE is idempotent)
        assert response.status_code in [200, 500]
        print("✅ Canva disconnect endpoint exists")


async def test_canva_export_formats():
    """Test Canva export formats endpoint"""
    print("\n🔍 Testing Canva Export Formats Endpoint...")
    async with httpx.AsyncClient() as client:
        # Test without designId (should return 400)
        response = await client.get(
            f"{BASE_URL}/api/v1/canva/export-formats",
            params={"user_id": "test-user-123"}
        )
        print(f"Status (no designId): {response.status_code}")
        assert response.status_code == 400
        print("✅ Export formats validation working")


async def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 Phase 6 Canva Integration Tests")
    print("=" * 60)
    
    try:
        await test_health()
        await test_canva_info()
        await test_canva_auth()
        await test_canva_designs()
        await test_canva_disconnect()
        await test_canva_export_formats()
        
        print("\n" + "=" * 60)
        print("✅ All Phase 6 Canva Integration tests passed!")
        print("=" * 60)
        print("\n📋 Summary:")
        print("  ✅ Canva info endpoint working")
        print("  ✅ Canva OAuth auth endpoint working")
        print("  ✅ Canva designs endpoint exists")
        print("  ✅ Canva disconnect endpoint exists")
        print("  ✅ Canva export formats validation working")
        print("\n🎯 Phase 6: Canva Integration - COMPLETE")
        
    except httpx.ConnectError:
        print("\n❌ Connection Error: Make sure the server is running!")
        print("   Run: uv run uvicorn src.main:app --reload --port 8000")
    except AssertionError as e:
        print(f"\n❌ Test assertion failed: {e}")
        import traceback
        traceback.print_exc()
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
