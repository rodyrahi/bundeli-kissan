#!/bin/bash

MAX_SIZE_KB=100
MAX_INITIAL_SIZE_KB=1024
MAX_WIDTH=800
MAX_HEIGHT=600

# Process images
find . -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) -exec bash -c '
    size_kb=$(du -k "$1" | cut -f 1)
    extension="${1##*.}"
    
    if [ "$size_kb" -gt '$MAX_INITIAL_SIZE_KB' ]; then
        if [[ "$extension" =~ ^(jpg|jpeg|png)$ ]]; then
            if [ "$extension" == "png" ]; then
                optipng -o6 -strip all "$1"
            else
                jpegoptim --max=60 --strip-all "$1"
            fi
        else
            echo "Unsupported image format: $extension"
        fi
    fi
    
    size_kb=$(du -k "$1" | cut -f 1)
    
    if [ "$size_kb" -gt '$MAX_SIZE_KB' ]; then
        convert "$1" -resize '$MAX_WIDTH'x'$MAX_HEIGHT' "$1"
        jpegoptim --max=60 --strip-all "$1"
        size_kb=$(du -k "$1" | cut -f 1)
        
        if [ "$size_kb" -gt '$MAX_SIZE_KB' ]; then
            echo "Image $1 optimized and still larger than $MAX_SIZE_KB KB, skipping compression"
        else
            echo "Image $1 optimized, resized, and compressed to $size_kb KB"
        fi
    else
        echo "Image $1 is already under $MAX_INITIAL_SIZE_KB KB, skipping compression"
    fi
' bash {} \;

echo "Image resize and compression complete!"
