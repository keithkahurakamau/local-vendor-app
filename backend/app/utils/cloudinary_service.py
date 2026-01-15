import cloudinary
import cloudinary.uploader
import os

def upload_image(file_obj):
    """
    Uploads a file to Cloudinary and returns the secure URL.
    """
    if not file_obj:
        return None

    try:
        # Check if config exists, if not, load from env
        if not cloudinary.config().cloud_name:
            cloudinary.config(
                cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
                api_key=os.getenv('CLOUDINARY_API_KEY'),
                api_secret=os.getenv('CLOUDINARY_API_SECRET')
            )

        # Upload to a specific folder
        upload_result = cloudinary.uploader.upload(
            file_obj,
            folder="local_vendor_app/menu_items"
        )
        return upload_result.get('secure_url')
    except Exception as e:
        print(f"Cloudinary Upload Error: {e}")
        return None