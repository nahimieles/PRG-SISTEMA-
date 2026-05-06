-- Este script añade la columna sharepoint_folder_url a la tabla companies 
-- para guardar la URL y cargar los archivos de manera instantánea

ALTER TABLE companies ADD COLUMN IF NOT EXISTS sharepoint_folder_url TEXT;
