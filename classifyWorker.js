// const mobilenet = require("@tensorflow-models/mobilenet")

const { connectToDb } = require('./lib/mongo')
const { connectToRabbitMQ, getChannel } = require('./lib/rabbitmq')
const { getDownloadStreamById, updateImageTagsById } = require("./models/image")

async function run () {
    // const classifier = await mobilenet.load()
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
                // Do classification work
                const tags = [ "cat" ]
                const result = await updateImageTagsById(id, tags)
                console.log("== result:", result)
            })
        }
        channel.ack(msg)
    })
}

connectToDb(function () {
    run()
})
