<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Throwable;

class UploadProductImages extends Command
{
    /*
    |--------------------------------------------------------------------------
    | Artisan Command Definition
    |--------------------------------------------------------------------------
    |
    | This allows us to run:
    |
    |     php artisan products:upload-images
    |
    | The --force option allows us to re-upload files that already exist.
    |
    */

    protected $signature = 'products:upload-images
                            {--force : Re-upload files that already exist}';

    /*
    |--------------------------------------------------------------------------
    | Command Description
    |--------------------------------------------------------------------------
    */

    protected $description = 'Upload product seed images to Supabase Storage';


    /*
    |--------------------------------------------------------------------------
    | Handle the Command
    |--------------------------------------------------------------------------
    |
    | This is where the actual upload process happens.
    |
    */

    public function handle(): int
    {
        /*
        |--------------------------------------------------------------------------
        | 1. Find our local product images
        |--------------------------------------------------------------------------
        |
        | Our images are currently stored here:
        |
        | database/seed-assets/products/
        |
        | For example:
        |
        | database/seed-assets/products/
        | └── amani-beaded-slide/
        |     ├── 1.png
        |     ├── 2.png
        |     └── 3.png
        |
        */

        $sourceDirectory = database_path('seed-assets/products');


        /*
        |--------------------------------------------------------------------------
        | 2. Connect to our Supabase Storage disk
        |--------------------------------------------------------------------------
        |
        | The "supabase" disk comes from config/filesystems.php.
        |
        | Laravel will use the S3-compatible Supabase Storage API
        | using the credentials we placed in .env.
        |
        */

        $storage = Storage::disk('supabase');


        /*
        |--------------------------------------------------------------------------
        | 3. Make sure the local image directory exists
        |--------------------------------------------------------------------------
        */

        if (! is_dir($sourceDirectory)) {
            $this->error(
                "Product image directory does not exist: {$sourceDirectory}"
            );

            return self::FAILURE;
        }


        /*
        |--------------------------------------------------------------------------
        | 4. Find all image files
        |--------------------------------------------------------------------------
        |
        | glob() searches inside:
        |
        | database/seed-assets/products/
        */

        $files = collect(
            glob($sourceDirectory . '/*/*')
        )


            /*
            |--------------------------------------------------------------------------
            | 5. Only keep actual files
            |--------------------------------------------------------------------------
            */

            ->filter(function ($file) {
                return is_file($file);
            })


            /*
            |--------------------------------------------------------------------------
            | 6. Only allow supported image formats
            |--------------------------------------------------------------------------
            |
            | We currently have PNG files, but we also allow:
            |
            | JPG
            | JPEG
            | PNG
            | WebP
            |
            */

            ->filter(function ($file) {
                $extension = strtolower(
                    pathinfo($file, PATHINFO_EXTENSION)
                );

                return in_array(
                    $extension,
                    ['jpg', 'jpeg', 'png', 'webp']
                );
            })


            /*
            |--------------------------------------------------------------------------
            | 7. Sort the files
            |--------------------------------------------------------------------------
            |
            | This makes the output easier to follow.
            |
            */

            ->sort()
            ->values();


        /*
        |--------------------------------------------------------------------------
        | 8. Stop if no images were found
        |--------------------------------------------------------------------------
        */

        if ($files->isEmpty()) {
            $this->error('No product images were found.');

            return self::FAILURE;
        }


        /*
        |--------------------------------------------------------------------------
        | 9. Display how many images we found
        |--------------------------------------------------------------------------
        */

        $this->info(
            "Found {$files->count()} product images."
        );

        $this->newLine();


        /*
        |--------------------------------------------------------------------------
        | 10. Keep track of our results
        |--------------------------------------------------------------------------
        |
        | These counters allow us to see what happened after the upload.
        |
        */

        $uploaded = 0;
        $skipped = 0;
        $failed = 0;


        /*
        |--------------------------------------------------------------------------
        | 11. Process every image
        |--------------------------------------------------------------------------
        */

        foreach ($files as $file) {

            /*
            |--------------------------------------------------------------------------
            | 11a. Convert the local file path into a relative path
            |--------------------------------------------------------------------------
            |
            | Suppose our local file is:
            |
            | database/seed-assets/products/amani-beaded-slide/1.png
            |
            | We only want:
            |
            | amani-beaded-slide/1.png
            |
            */

            $relativePath = str_replace(
                $sourceDirectory . DIRECTORY_SEPARATOR,
                '',
                $file
            );


            /*
            |--------------------------------------------------------------------------
            | 11b. Build the Supabase Storage path
            |--------------------------------------------------------------------------
            |
            | We want every product image to live under:
            |
            | products/
            |
            | Therefore:
            |
            | amani-beaded-slide/1.png
            |
            | becomes:
            |
            | products/amani-beaded-slide/1.png
            |
            */

            $storagePath = 'products/' . str_replace(
                    DIRECTORY_SEPARATOR,
                    '/',
                    $relativePath
                );


            /*
            |--------------------------------------------------------------------------
            | 11c. Try to upload the image
            |--------------------------------------------------------------------------
            |
            | The try/catch prevents one failed image from crashing
            | the entire process.
            |
            */

            try {

                /*
                |--------------------------------------------------------------------------
                | Check whether this image already exists
                |--------------------------------------------------------------------------
                |
                | By default, we DON'T overwrite existing images.
                |
                | This makes the command safe to run again.
                |
                */

                if (
                    $storage->exists($storagePath)
                    && ! $this->option('force')
                ) {

                    $this->line(
                        "SKIP  {$storagePath}"
                    );

                    $skipped++;

                    continue;
                }


                /*
                |--------------------------------------------------------------------------
                | Read the local image and upload it
                |--------------------------------------------------------------------------
                |
                | file_get_contents() reads the image from our computer.
                |
                | Storage::disk('supabase')->put()
                | sends it to Supabase Storage.
                |
                */

                $storage->put(
                    $storagePath,
                    file_get_contents($file),
                    'public'
                );


                /*
                |--------------------------------------------------------------------------
                | Upload successful
                |--------------------------------------------------------------------------
                */

                $this->info(
                    "UPLOAD {$storagePath}"
                );

                $uploaded++;

            } catch (Throwable $exception) {

                /*
                |--------------------------------------------------------------------------
                | Something went wrong with this particular image
                |--------------------------------------------------------------------------
                */

                $this->error(
                    "FAILED {$storagePath}: {$exception->getMessage()}"
                );

                $failed++;
            }
        }


        /*
        |--------------------------------------------------------------------------
        | 12. Display the final results
        |--------------------------------------------------------------------------
        */

        $this->newLine();

        $this->info('Upload complete.');

        $this->line("Uploaded: {$uploaded}");
        $this->line("Skipped:  {$skipped}");
        $this->line("Failed:   {$failed}");


        /*
        |--------------------------------------------------------------------------
        | 13. Tell Artisan whether the command succeeded
        |--------------------------------------------------------------------------
        |
        | If even one image failed, return FAILURE.
        |
        | Otherwise return SUCCESS.
        |
        */

        return $failed > 0
            ? self::FAILURE
            : self::SUCCESS;
    }
}

