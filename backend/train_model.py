import os
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
import pathlib

# Configuration
BATCH_SIZE = 32
IMG_SIZE = (224, 224)
EPOCHS = 5 # Reduced for faster CPU training. Increase to 15-20 if you have a GPU.

# The dataset is located one directory up, in `archive/PlantVillage`
# Note: If there's a nested 'PlantVillage' folder, make sure the path points directly to the class folders
data_dir = pathlib.Path('../archive/PlantVillage')

def build_model(num_classes):
    # Data Augmentation layer to prevent overfitting
    data_augmentation = keras.Sequential(
        [
            layers.RandomFlip("horizontal_and_vertical"),
            layers.RandomRotation(0.2),
            layers.RandomZoom(0.1),
        ],
        name="data_augmentation"
    )

    # Base model using MobileNetV2 pre-trained on ImageNet
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights='imagenet'
    )
    # Freeze the base model
    base_model.trainable = False

    # Create the complete model
    inputs = tf.keras.Input(shape=(224, 224, 3))
    
    # Keras' MobileNetV2 expects pixel values in [-1, 1], but image_dataset_from_directory outputs [0, 255]
    # We apply preprocessing within the model
    x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs)
    x = data_augmentation(x)
    
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.2)(x)
    
    outputs = layers.Dense(num_classes, activation="softmax")(x)
    model = keras.Model(inputs, outputs)
    
    # Compile
    model.compile(
        optimizer=keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    
    return model

def main():
    print(f"Loading dataset from: {data_dir.resolve()}")
    
    if not data_dir.exists():
        print(f"Error: Directory {data_dir.resolve()} not found!")
        return
        
    # Validation split: 80% Training, 20% Validation
    train_dataset = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=0.2,
        subset="training",
        seed=1337,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
    )
    
    val_dataset = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=0.2,
        subset="validation",
        seed=1337,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
    )
    
    class_names = train_dataset.class_names
    num_classes = len(class_names)
    print(f"Found {num_classes} classes: {class_names}")
    
    # Save class names for the API
    with open('class_names.txt', 'w') as f:
        for cls in class_names:
            f.write(f"{cls}\n")
    print("Saved class names to class_names.txt")
    
    # Optimize dataset pipeline for performance
    AUTOTUNE = tf.data.AUTOTUNE
    train_dataset = train_dataset.prefetch(buffer_size=AUTOTUNE)
    val_dataset = val_dataset.prefetch(buffer_size=AUTOTUNE)
    
    print("Building model...")
    model = build_model(num_classes)
    model.summary()
    
    print("Starting training...")
    # Add EarlyStopping so it doesn't train pointlessly if accuracy maxes out
    callbacks = [
        keras.callbacks.EarlyStopping(monitor='val_loss', patience=2, restore_best_weights=True)
    ]
    
    history = model.fit(
        train_dataset,
        epochs=EPOCHS,
        validation_data=val_dataset,
        callbacks=callbacks
    )
    
    # Save the trained model
    model.save("plant_disease_model.keras")
    print("Model successfully trained and saved as 'plant_disease_model.keras'!")
    print("You can now run the backend server with 'uvicorn app:app --reload'")

if __name__ == '__main__':
    main()
