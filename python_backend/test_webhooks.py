"""
Test script for Phase 5: Webhooks
Tests Meta Ads webhook verification and event handling
"""
import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"


async def test_health():
    """Test health endpoint"""
    print("\n🔍 Testing Health Endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        assert response.status_code == 200
        print("✅ Health check passed")


async def test_webhooks_info():
    """Test webhooks info endpoint"""
    print("\n🔍 Testing Webhooks Info Endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/v1/webhooks/")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Service: {data.get('service')}")
        print(f"Endpoints: {list(data.get('endpoints', {}).keys())}")
        print(f"Supported events: {list(data.get('supported_events', {}).keys())}")
        assert response.status_code == 200
        assert data.get("service") == "Webhooks"
        print("✅ Webhooks info endpoint passed")


async def test_meta_webhook_verification():
    """Test Meta webhook verification endpoint"""
    print("\n🔍 Testing Meta Webhook Verification...")
    async with httpx.AsyncClient() as client:
        # Valid verification request
        response = await client.get(
            f"{BASE_URL}/api/v1/webhooks/meta-ads",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "meta_ads_webhook_token",
                "hub.challenge": "test_challenge_123"
            }
        )
        print(f"Status (valid token): {response.status_code}")
        print(f"Response: {response.text}")
        assert response.status_code == 200
        assert response.text == "test_challenge_123"
        print("✅ Valid verification passed")
        
        # Invalid verification request
        response = await client.get(
            f"{BASE_URL}/api/v1/webhooks/meta-ads",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "wrong_token",
                "hub.challenge": "test_challenge_123"
            }
        )
        print(f"Status (invalid token): {response.status_code}")
        assert response.status_code == 403
        print("✅ Invalid verification correctly rejected")


async def test_meta_webhook_event():
    """Test Meta webhook event handling"""
    print("\n🔍 Testing Meta Webhook Event Handling...")
    async with httpx.AsyncClient() as client:
        # Campaign status change event
        event_payload = {
            "object": "campaign",
            "entry": [
                {
                    "id": "123456789",
                    "changes": [
                        {
                            "field": "status",
                            "value": "PAUSED"
                        }
                    ]
                }
            ]
        }
        
        response = await client.post(
            f"{BASE_URL}/api/v1/webhooks/meta-ads",
            json=event_payload
        )
        print(f"Status (campaign event): {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        assert response.status_code == 200
        assert data.get("success") == True
        print("✅ Campaign event handled successfully")
        
        # Ad disapproval event
        ad_event = {
            "object": "ad",
            "entry": [
                {
                    "id": "987654321",
                    "changes": [
                        {
                            "field": "status",
                            "value": "DISAPPROVED"
                        }
                    ]
                }
            ]
        }
        
        response = await client.post(
            f"{BASE_URL}/api/v1/webhooks/meta-ads",
            json=ad_event
        )
        print(f"Status (ad disapproval event): {response.status_code}")
        assert response.status_code == 200
        print("✅ Ad disapproval event handled successfully")


async def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 Phase 5 Webhooks Tests")
    print("=" * 60)
    
    try:
        await test_health()
        await test_webhooks_info()
        await test_meta_webhook_verification()
        await test_meta_webhook_event()
        
        print("\n" + "=" * 60)
        print("✅ All Phase 5 Webhooks tests passed!")
        print("=" * 60)
        print("\n📋 Summary:")
        print("  ✅ Webhooks info endpoint working")
        print("  ✅ Meta webhook verification working")
        print("  ✅ Meta webhook event handling working")
        print("  ✅ Campaign status events handled")
        print("  ✅ Ad disapproval events handled")
        print("\n🎯 Phase 5: Webhooks - COMPLETE")
        
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
