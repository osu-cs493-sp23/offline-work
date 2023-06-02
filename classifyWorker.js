const tf = require("@tensorflow/tfjs-node")
const mobilenet = require("@tensorflow-models/mobilenet")


const { connectToDb } = require('./lib/mongo')
const { connectToRabbitMQ, getChannel } = require('./lib/rabbitmq')
const { getDownloadStreamById, updateImageTagsById } = require("./models/image")


async function run () {
    const classifier = await mobilenet.load()
    await connectToRabbitMQ("images")
    const channel = getChannel()

    channel.consume("images", async msg => {
        if (msg) {
            const id = msg.content.toString()
            const downloadStream = getDownloadStreamById(id)

            const imageData = []
            downloadStream.on("data", function (data) {
                imageData.push(data)
            })
            downloadStream.on("end", async function () {
                const imgBuffer = Buffer.concat(imageData)

                const img = tf.node.decodeImage(imgBuffer)
                const classifications = await classifier.classify(img)
                const tags = classifications
                    .filter(c => c.probability > 0.5)
                    .map(c => c.className)
                console.log("== tags:", tags)
                const result = await updateImageTagsById(id, tags)
            })
        }
        channel.ack(msg)
    })
}

connectToDb(function () {
    run()
})
